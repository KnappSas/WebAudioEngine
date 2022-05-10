const exports = {};

let audioWriter = null;
let trackModel = null;
let store = null;
let currentBuffers = null;
let fileReadPos = 0;
let chunk = null;
let nextChunk = null;
let numberOfOutputs = 0;

const samplesPerTrack = 128;

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
                let promises = [];
                for (let iTrack = 0; iTrack < numberOfOutputs; iTrack++) {
                    const track = trackModel.tracks[iTrack];
                    const fileName = track.files[0].name;

                    promises.push(store.getAudioBuffer(fileName));
                }

                currentBuffers = await Promise.all(promises);
                console.log(currentBuffers);

                const timeout = () => {
                    if (!audioWriter) {
                        return;
                    }

                    while (audioWriter.available_write() > chunk.length) {
                        let offset = 0;
                        for (let iTrack = 0; iTrack < numberOfOutputs; iTrack++) {
                            const channel_data = currentBuffers[iTrack].getChannelData(0);
                            let tmpFileReadPos = fileReadPos;
                            for (let i = 0; i < samplesPerTrack; i++) {
                                let chunkIndex = i + offset;
                                if (tmpFileReadPos < channel_data.length) {
                                    chunk[chunkIndex] = channel_data[tmpFileReadPos];
                                } else {
                                    chunk[chunkIndex] = 0.0;
                                }
    
                                tmpFileReadPos++;
                            }

                            offset += samplesPerTrack;
                        }

                        fileReadPos += samplesPerTrack;
                        audioWriter.enqueue(chunk);
                    }

                    setTimeout(timeout, 10);
                }

                timeout();
            });

            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
}
