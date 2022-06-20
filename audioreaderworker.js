const exports = {};

let trackModel = null;
let store = null;
let buffer = null;
let numberOfOutputs = 0;

let bufferOffset = 0;

let sampleRate = 44100;

async function loadBuffer(iTrackStart, iTrackEnd, startTime, duration) {
    let numChunks = duration / 128;
    let audioBuffers = [];

    let startTimeInSamples = startTime;//startTime * 44100;
    let endTimeInSamples = startTimeInSamples + duration;
    let numSamplesToLoad = endTimeInSamples - startTimeInSamples;

    for (let iTrack = iTrackStart; iTrack < iTrackEnd; iTrack++) {
        const track = trackModel.tracks[iTrack];

        let audioBuffer = new AudioBuffer(2, sampleRate * 2, sampleRate);
        const f32 = new Float32Array(sampleRate * 2);
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            audioBuffer.getChannelData(i).set(f32);
        }

        let reaminingTrackSamplesToLoad = numSamplesToLoad;
        let offset = 0;
        for (let iClip = track.lastClipIndex; iClip < track.clips.length; iClip++) {
            if (reaminingTrackSamplesToLoad <= 0) {
                break;
            }

            let tmpCursor = startTimeInSamples + offset;
            const clip = track.clips[iClip];
            if (tmpCursor >= clip.samplePos && tmpCursor < clip.samplePos + clip.length) {
                let iPosInClip = tmpCursor - clip.samplePos;
                let iFileReadPos = iPosInClip + clip.iStartInFile;
                let remainingClipLength = clip.length - iPosInClip;
                let numSamplesToRead = Math.min(reaminingTrackSamplesToLoad, remainingClipLength);

                let fPos = Math.floor(iFileReadPos / sampleRate);
                let fposOffset = iFileReadPos - fPos * sampleRate;

                let srcBuffer = await store.getAudioBuffer(clip.fileName, fPos, 4);
                for (let iSample = 0; iSample < numSamplesToRead; iSample++) {
                    audioBuffer.getChannelData(0)[iSample + offset] = srcBuffer.getChannelData(0)[iSample + fposOffset];
                }

                reaminingTrackSamplesToLoad -= numSamplesToRead;
                offset += numSamplesToRead;
                track.lastClipIndex = iClip;
            } else {
                break;
            }
        }

        audioBuffers.push(audioBuffer);
    }

    let numBuffers = audioBuffers.length;
    for (let i = 0; i < numBuffers; i++) {
        let iBuffer = audioBuffers[i];
        let channel_data = iBuffer.getChannelData(0);

        let trackOffset = + (iTrackStart + i) * 128;
        for (let iChunk = 0; iChunk < numChunks; iChunk++) {
            let srcOffset = iChunk * 128;
            let chunkOffset = iChunk * 128 * numberOfOutputs;
            let sampleOffset = chunkOffset + trackOffset + bufferOffset;
            for (let iSample = 0; iSample < 128; iSample++) {
                buffer[iSample + sampleOffset] = channel_data[iSample + srcOffset];
            }
        }
    }

    // console.log("buffer: ", buffer.slice(0, buffer.length), "offset: ", bufferOffset);
    bufferOffset = bufferOffset > 0 ? 0 : buffer.length / 2;
    postMessage({ command: "preloadDone" });
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
