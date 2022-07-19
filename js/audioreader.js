'use strict'

const exports = {};

// import AudioStore from '@audiostore/lib/audiostore.js';
// import {AudioWriter} from 'ringbuf.js';

let audioWriter = null;
let track = null;
let store = null;
let currentBuffer = null;
let nextBuffer = null;
let fileReadPos = 0;
let chunk = null;
let nextChunk = null;
let numberOfOutputs = 0;

let chunkIndex = 0;
const chunkSize = 128;
let bufferSize = 44160;
let fPos = 0;

onmessage = e => {
    switch (e.data.command) {
        case "init": {
            console.log("init worker");
            audioWriter = new AudioWriter(new RingBuffer(e.data.sabs[0], Float32Array));
            track = e.data.tracks[0];
            store = new AudioStore();

            chunk = new Float32Array(chunkSize);

            store.init().then(async () => {
                const fileName = track.clips[0].fileName;
                console.log(fileName);

                const duration = bufferSize/44100; 
                const inc = bufferSize/44100;

                currentBuffer = await store.getAudioBuffer(fileName, fPos, duration);
                fPos += inc;
                nextBuffer = await store.getAudioBuffer(fileName, fPos, duration);
                fPos += inc;

                const timeout = async () => {
                    if (!audioWriter) {
                        return;
                    }

                    while (audioWriter.available_write() > chunkSize) {
                        chunk.set(currentBuffer.getChannelData(0).slice(chunkIndex, chunkIndex + chunkSize))
                        audioWriter.enqueue(chunk);
                        chunkIndex+=chunkSize;

                        if(chunkIndex >= bufferSize) {
                            [currentBuffer, nextBuffer] = [nextBuffer, currentBuffer]; // swap
                            nextBuffer = await store.getAudioBuffer(fileName, fPos, duration);
                            chunkIndex = 0;
                            fPos += inc;
                        }
                    }

                    setTimeout(timeout, 10);
                }

                timeout();
                postMessage({command: "ready"});
            });

            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
};
