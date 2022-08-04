'use strict'

// import AudioStore from '@audiostore/lib/audiostore.js';
// import { RingBuffer } from 'ringbuf.js';
// import Track from "./track.js";
// import URLFromFiles from "../utils.js";

const audioEnginePrototype = {
    async setupAudioReader(sabs) {
        const WORKER_PATH = 'js/audioreader.js';
        const AUDIO_STORE_PATH = 'node_modules/@audiostore/lib/index.js';
        const AUDIO_WRITER_PATH = 'node_modules/ringbuf.js/dist/index.js';
        const PRELOAD_TASK_PATH = 'js/preloadtask.js';

        const url = await URLFromFiles([WORKER_PATH, AUDIO_STORE_PATH, AUDIO_WRITER_PATH, PRELOAD_TASK_PATH]);
        let trackModels = [];
        this.tracks.forEach(track => {
            trackModels.push(track.model);
        });

        console.log("setupWorker...");
        await setupWorker(url, trackModels, sabs, 8);
        console.log("ready");
    },

    addModule(audioContext, files) {
        const url = URLFromFiles(files);
        return audioContext.audioWorklet.addModule(url);
    },

    async setupAudioRoutingGraph() {
        if (this.audioContext.audioWorklet === undefined) {
            log("No AudioWorklet.");
        } else {
            if (this.audioContext.audioWorklet === undefined) {
                log("No AudioWorklet available.");
                return;
            }

            const url = await URLFromFiles(['js/wave-processor.js', 'node_modules/ringbuf.js/dist/index.js']);
            await this.audioContext.audioWorklet.addModule(url);
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);

            // let promises = [];
            // const sabs = [];
            // const numChannels = trackModel.tracks.length;
            // for (let iTrack = 0; iTrack < numChannels; iTrack++) {
            //     const sab = exports.RingBuffer.getStorageForCapacity(
            //         (this.audioContext.sampleRate),
            //         Float32Array
            //     );

            //     sabs.push(sab);

            //     let track = new Track(this.audioContext, this.store);
            //     track.initialize(sab);

            //     this.mixer.addChannel(track);
            //     this.mixer.setGain(iTrack, 1 / numChannels);

            //     this.tracks.push(track);

            //     track.connectToOutput(masterGain);

            //     promises.push(track.loadFileAsClip(trackModel.tracks[iTrack].clips[0].fileName));

            //     for(let i = 0; i < 10; i++) {
            //         track.addPlugin(pluginCollection.get('LoadGeneratorJS'));
            //     }
            // }

            // await Promise.all(promises);
            // this.setupAudioReader(sabs);

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

    async startAudio() {
        await this.setupAudioReader(this.sabs);
        this.audioContext.resume();
    },

    stopAudio() {
        this.audioContext.suspend();
    },

    addTrack(options) {
        const sab = exports.RingBuffer.getStorageForCapacity(
            (this.audioContext.sampleRate),
            Float32Array
        );

        this.sabs.push(sab);

        let track = new Track(this.audioContext, this.store);
        track.initialize(sab);

        this.mixer.addChannel(track);
        this.mixer.setGain(this.tracks.length, options.gain);

        track.connectToOutput(this.masterGain);

        this.tracks.push(track);
    },

    findTrack(trackId) {
        for (let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            if (track.id === trackId) {
                return track;
            }
        }

        return new Track(this.audioContext, this.store);
    },

    async addFileToTrack(trackId, fileName) {
        let track = this.findTrack(trackId);
        console.log(track);
        await track.loadFileAsClip(fileName);
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
    this.sabs = [];

    this.mixer = new Mixer();
    this.masterGain = null;
}

Object.assign(AudioEngine.prototype, audioEnginePrototype);
