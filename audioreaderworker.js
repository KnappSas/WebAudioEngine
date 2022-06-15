const exports = {};

let trackModel = null;
let store = null;
let buffer = null;
let numberOfOutputs = 0;

let bufferOffset = 0;

let storeOffset = 0;

async function loadBuffer(iTrackStart, iTrackEnd, startTime, duration) {
    console.log("iTrackStart: ", iTrackStart);
    let numChunks = 44160 * duration / 128;
    let promises = [];
    for (let iTrack = iTrackStart; iTrack < iTrackEnd; iTrack++) {
        const track = trackModel.tracks[iTrack];
        const fileName = track.files[0].name;
        promises.push(store.getAudioBuffer(fileName, startTime, 2));
    }

    let buffers = await Promise.all(promises);
    let numBuffers = buffers.length;
    for (let i = 0; i < numBuffers; i++) {
        let iBuffer = buffers[i];
        let channel_data = iBuffer.getChannelData(0);
        
        let trackOffset = + (iTrackStart + i)* 128;
        for (let iChunk = 0; iChunk < numChunks; iChunk++) {
            let srcOffset = iChunk * 128;
            let chunkOffset = iChunk * 128 * numberOfOutputs;
            let sampleOffset = chunkOffset + trackOffset + bufferOffset;
            for (let iSample = 0; iSample < 128; iSample++) {
                buffer[iSample + sampleOffset] = channel_data[iSample + srcOffset + storeOffset];
            }
        }
    }

    // console.log("buffer: ", buffer.slice(0, buffer.length), "offset: ", bufferOffset);
    bufferOffset = bufferOffset > 0 ? 0 : buffer.length / 2;
    storeOffset += 60;
    postMessage({ command: "preloadDone"});
}

onmessage = e => {
    switch (e.data.command) {
        case "init": {
            console.log("init worker");

            trackModel = e.data.trackModel;
            numberOfOutputs = e.data.numberOfOutputs;
            console.log(trackModel);

            store = new AudioStore();
            store.init().then(() => {
                buffer = new Float32Array(e.data.sab);
                postMessage({ command: "ready" });
            });
            break;
        }
        case "preloadBuffer": {
            console.log("preloadBuffer");
            loadBuffer(e.data.iTrackStart, e.data.iTrackEnd, e.data.startTime, e.data.duration);
            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
}
