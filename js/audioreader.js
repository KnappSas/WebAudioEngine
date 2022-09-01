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
let nextChunk = null;
let numberOfOutputs = 0;

let chunkIndex = 0;
const chunkSize = 128;
let bufferSize = 44160;

let workerURL = null;

onmessage = e => {
    switch (e.data.command) {
        case "init": {
            console.log("init worker");
            const tracks = e.data.tracks;

            store = new AudioStore();
            store.init().then(async () => {
                
                let iTrack = 0;
                const taskConfig = {
                    tracks: tracks.slice(iTrack, tracks.length),
                    bufferSize: bufferSize,
                    sabs: e.data.sabs.slice(iTrack, tracks.length),
                    sampleRate: e.data.sampleRate
                }

                await startPreloading(taskConfig);
                postMessage({ command: "ready" });
            });

            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
};
