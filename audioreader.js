const exports = {};

let audioWriter = null;
let trackModel = null;
let currentBuffers = null;
let nextBuffers = null;
let fileReadPos = 0;
let chunk = null;
let numberOfOutputs = 0;

const sampleRate = 44100;
const samplesPerTrack = 128;

let duration = 44160;
let nextTransportSeconds = 0;

let rest = 0;

const nWorkers = 10;
let workers = [];

let numChunks = 0;
let chunkSize = 0;

let sabSize = 0;

let chunkIndex = 0;

let bufferOffset = 0;

let nextTimeSliceIndex = 0;

function fillSharedMemory() {
    if (!audioWriter)
        return;

    while (audioWriter.available_write() > chunk.length) {
        audioWriter.enqueue(currentBuffers.slice(chunkIndex + bufferOffset, chunkIndex + bufferOffset + chunkSize));
        chunkIndex += chunkSize;

        if (chunkIndex >= nextTimeSliceIndex) {
            bufferOffset = bufferOffset > 0 ? 0 : nextTimeSliceIndex;
            chunkIndex = 0;
            Promise.all(preloadBuffers(nextTransportSeconds, numberOfOutputs, nWorkers)).then(() => {
                nextTransportSeconds += duration;
            });
        }
    }
}

onmessage = e => {
    switch (e.data.command) {
        case "init": {
            console.log("init worker");
            audioWriter = new AudioWriter(new RingBuffer(e.data.sab, Float32Array));
            trackModel = e.data.trackModel;
            numberOfOutputs = trackModel.tracks.length;
            chunk = new Float32Array(samplesPerTrack * numberOfOutputs);
            store = new AudioStore();

            store.init().then(async () => {
                let numChunksPerTrackInTimeSlice = (sampleRate % samplesPerTrack) > 0 ? Math.floor(sampleRate / samplesPerTrack + 1) : sampleRate / samplesPerTrack;
                chunkSize = 128 * numberOfOutputs;

                // *2 for next time slice portion in buffer, see needSwitch
                sabSize = chunkSize * numChunksPerTrackInTimeSlice * 2;
                nextTimeSliceIndex = sabSize / 2;
                let capacity = sabSize * Float32Array.BYTES_PER_ELEMENT;
                const sab = new SharedArrayBuffer(capacity);
                currentBuffers = new Float32Array(sab, 0, sab.byteLength / Float32Array.BYTES_PER_ELEMENT);
                let workerPromises = [];
                for (let i = 0; i < nWorkers; i++) {
                    let readerWorker = new Worker(e.data.workerURL);

                    let p = new Promise((resolve, reject) => {
                        readerWorker.onmessage = e => {
                            switch (e.data.command) {
                                case "ready": {
                                    resolve();
                                    break;
                                }
                            }
                        }
                    });

                    workerPromises.push(p);

                    readerWorker.postMessage({ command: "init", sab: sab, numberOfOutputs: numberOfOutputs, trackModel: trackModel });
                    workers.push(readerWorker);
                }

                await Promise.all(workerPromises);
                await Promise.all(preloadBuffers(0, numberOfOutputs, nWorkers));
                await Promise.all(preloadBuffers(duration, numberOfOutputs, nWorkers));
                nextTransportSeconds = 2 * duration;

                const timeout = () => {
                    fillSharedMemory();
                    setTimeout(timeout, 10);
                }

                timeout();
                setTimeout(() => { postMessage({ command: "ready" }); }, 5000);
            });

            break;
        }
        case "preload debug":
            preloadDebug();
            break;
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
}

async function preloadDebug() {
    await Promise.all(preloadBuffers(nextTransportSeconds, numberOfOutputs, nWorkers));
    nextTransportSeconds+=duration;
}

function preloadBuffers(nextTransportSeconds, nTracks, nWorkers) {
    console.log("preload buffers");
    let tracksPerWorker = Math.floor(nTracks / nWorkers);
    let rest = nTracks - tracksPerWorker*nWorkers;

    console.log("tracksPerWorker: ", tracksPerWorker, "rest: ", rest);

    let promises = [];

    let setupAudioReaderWorker = (iWorker, nTracksPerWorker) => {
        let p = new Promise((resolve, reject) => {
            workers[iWorker].onmessage = e => {
                switch (e.data.command) {
                    case "preloadDone": {
                        resolve();
                        break;
                    }
                }
            }
    
            workers[iWorker].postMessage({
                command: "preloadBuffer",
                iTrackStart: iWorker * nTracksPerWorker,
                iTrackEnd: (iWorker + 1) * nTracksPerWorker,
                startTime: nextTransportSeconds,
                duration: duration
            });
        });
    }

    const numFullWorkers = rest > 0 ? workers.length-1 : workers.length;
    for (let iWorker = 0; iWorker < numFullWorkers; iWorker++) {
        promises.push(setupAudioReaderWorker(iWorker, tracksPerWorker));
    }

    if(rest > 0) {
        let lastWorkerIndex = workers.length - 1;
        promises.push(setupAudioReaderWorker(lastWorkerIndex, rest));
    }

    return promises;
}
