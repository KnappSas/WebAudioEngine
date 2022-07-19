'use strict'

// import AudioStore from '@audiostore/lib/audiostore.js';
// import { RingBuffer } from 'ringbuf.js';
// import Track from "./track.js";
// import URLFromFiles from "../utils.js";

const audioEnginePrototype = {
    setupAudioReader(sabs) {
        const WORKER_PATH = 'js/audioreader.js';
        const AUDIO_STORE_PATH = 'node_modules/@audiostore/lib/index.js';
        const AUDIO_WRITER_PATH = 'node_modules/ringbuf.js/dist/index.js';

        URLFromFiles([WORKER_PATH, AUDIO_STORE_PATH, AUDIO_WRITER_PATH]).then(async (url) => {
            this.worker = new Worker(url);

            let trackModels = [];
            this.tracks.forEach(track => {
                trackModels.push(track.model);
            });

            this.worker.postMessage({
                command: "init",
                sabs: sabs,
                tracks: trackModels,
            });

            this.worker.onmessage = e => {
                console.log("ready");
                switch (e.data.command) {
                    case "ready": {
                        document.getElementById("startBtn").disabled = false;
                        break;
                    }
                    default: {
                        throw Error("Unknown case in app.js");
                    }
                }
            }
        });
    },

    async createLoadGeneratorNode(input, iOutput, output) {
        const processorPath = window.language === "js" ? "plugins/LoadGeneratorWAM/js/load-processor.js" : "plugins/LoadGeneratorWAM/js/load-processor-wasm.js";
        const processorName = window.language === "js" ? "plugins/LoadGeneratorWAM/js/load-processor-js" : "plugins/LoadGeneratorWAM/js/load-processor-wasm";

        await audioContext.audioWorklet.addModule(processorPath);

        audioWorkletNode = new AudioWorkletNode(audioContext, processorName);
        audioWorkletNode.port.onmessage = (event) => onmessage(event.data);
        audioWorkletNode.connect(audioContext.destination);

        if (window.language === "wasm") {
            fetch("load-wasm/target/wasm32-unknown-unknown/release/load_wasm.wasm")
                .then(r => r.arrayBuffer())
                .then(r => audioWorkletNode.port.postMessage({ type: 'load-wasm-module', data: r }));
        }

        input
            .connect(audioWorkletNode, iOutput)
            .connect(output);

        return audioWorkletNode;
    },

    addModule(audioContext, files) {
        const url = URLFromFiles(files);
        console.log("hello1");
        return audioContext.audioWorklet.addModule(url);
    },

    async setupAudioRoutingGraph(trackModel) {
        if (this.audioContext.audioWorklet === undefined) {
            log("No AudioWorklet.");
        } else {
            if (this.audioContext.audioWorklet === undefined) {
                log("No AudioWorklet available.");
                return;
            } 

            // await this.addModule(this.audioContext, ['js/wave-processor.js', 'node_modules/ringbuf.js/dist/index.js']);
            URLFromFiles(['js/wave-processor.js', 'node_modules/ringbuf.js/dist/index.js']).then(async (url) => {
                await this.audioContext.audioWorklet.addModule(url);

                let masterGain = this.audioContext.createGain();
                masterGain.connect(this.audioContext.destination);

                let promises = [];

                const sabs = [];
                for (let iTrack = 0; iTrack < trackModel.tracks.length; iTrack++) {
                    const sab = exports.RingBuffer.getStorageForCapacity(
                        (this.audioContext.sampleRate / 20),
                        Float32Array
                    );

                    sabs.push(sab);

                    let track = new Track(this.audioContext, this.store);
                    track.initialize(sab);

                    this.tracks.push(track);
                    track.connectToOutput(masterGain);

                    promises.push(track.loadFileAsClip(trackModel.tracks[iTrack].clips[0].fileName));
                }

                await Promise.all(promises);

                // let d = 44160/44100
                // let inc = 44160/44100;

                // let fileName = this.tracks[0].model.clips[0].fileName;
                // let b0 = await this.store.getAudioBuffer(fileName, 0, d+d+d+d);
                // console.log(b0);
                // let b1 = await this.store.getAudioBuffer(fileName, 0, d); // 44159: -0.9971874356269836, 44160: -0.9939904808998108
                // console.log(b1);
                // let b2 = await this.store.getAudioBuffer(fileName, inc, d); // 88318: 0.9042859077453613, 88319: 0.9199953675270081, 88320: 0.934350848197937
                // console.log(b2);
                // let b3 = await this.store.getAudioBuffer(fileName, inc+inc, d); // 132477
                // console.log(b3);
                // let b4 = await this.store.getAudioBuffer(fileName, inc+inc+inc, d); // 
                // console.log(b4);

                this.setupAudioReader(sabs);

                // loadGenerator = await createLoadGeneratorNode(masterGain, 0, audioContext.destination);
                // let loadParam = loadGenerator.parameters.get("load");
                // loadParam.value = 10;
                // navigator.mediaDevices.getUserMedia({
                //     audio: {
                //         // echoCancellation: false,
                //         autoGainControl: false,
                //         noiseSuppression: false,
                //         latency: 0
                //     }
                // }).then(userMedia => {
                //     const input = audioContext.createMediaStreamSource(userMedia);
                //     input.connect(audioWorkletNode);
                // }
                // )  
            });
        }
    },

    loadTrackConfig(configFileName) {
        const request = new XMLHttpRequest();
        request.open("GET", configFileName);
        request.onload = function () {
            const trackModel = JSON.parse(request.responseText);
            setupAudioRoutingGraph(trackModel);
        }

        request.send();
    },

    startAudio() {
        this.audioContext.resume();
    },

    stopAudio() {
        this.audioContext.suspend();
    },

    changeProcessingLoad(newLoad = -1) {
        if (newLoad < 0) {
            console.log("changeProcessingLoad")
            let load = 0;
            if (loadGenerator) {
                let loadParam = loadGenerator.parameters.get("load");
                load = document.getElementById("load-slider").value;
                loadParam.value = load < 1 ? 0.001 : Math.floor(load);
            }

            document.getElementById("load-slider-label").innerHTML = `Load: ${load}`;
        } else {
            // in this case changeProcessingLoad was set with an explicit value
            document.getElementById("load-slider").value = newLoad;
            changeProcessingLoad();
        }
    }
};

function AudioEngine() {
    this.audioContext = new AudioContext();
    this.audioContext.suspend();

    console.log("audioContext.sampleRate: ", this.audioContext.sampleRate);

    this.store = new AudioStore(this.audioContext);
    this.store.init();

    this.worker = null;
    this.loadGenerator = null;

    this.decodedFileNames = [];
    this.tracks = [];
}

Object.assign(AudioEngine.prototype, audioEnginePrototype);
