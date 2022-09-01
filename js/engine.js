"use strict";

// import AudioStore from '@audiostore/lib/audiostore.js';
// import { RingBuffer } from 'ringbuf.js';
// import Track from "./track.js";
// import URLFromFiles from "../utils.js";

class AudioEngine {
    constructor() {
        this.audioContext = new AudioContext();
        this.audioContext.suspend();

        console.log("audioContext.sampleRate: ", this.audioContext.sampleRate);
        console.log("audioContext.baseLatency: ", this.audioContext.baseLatency);
        console.log("audioContext.outputLatency: ", this.audioContext.outputLatency);

        this.store = new AudioStore(this.audioContext);
        this.store.init();

        this.decodedFileNames = [];
        this.tracks = [];
        this.sabs = [];

        this.masterGain = null;

        this.currentDeviceId = "";

        const request = new XMLHttpRequest();
        request.open("GET", "../audio/sine_-12dB.wav");
        request.responseType = "arraybuffer";
        request.onload = () => {
            console.log("onload");
            let undecodedAudio = request.response;
            this.audioContext.decodeAudioData(undecodedAudio, (data) => {
                Track.buffer = data;
                console.log("buffer loaded");
            });
        };
        request.send();
    }

    async #setupAudioReader(sabs) {
        const WORKER_PATH = "js/audioreader.js";
        const AUDIO_STORE_PATH = "node_modules/@audiostore/lib/index.js";
        const AUDIO_WRITER_PATH = "node_modules/ringbuf.js/dist/index.js";
        const PRELOAD_TASK_PATH = "js/preloadtask.js";

        const url = await URLFromFiles([
            WORKER_PATH,
            AUDIO_STORE_PATH,
            AUDIO_WRITER_PATH,
            PRELOAD_TASK_PATH,
        ]);
        let trackModels = [];
        this.tracks.forEach((track) => {
            trackModels.push(track.model);
        });

        await setupWorker(url, trackModels, sabs, 1, this.audioContext.sampleRate);
    }

    async initialize() {
        // ask for devices on startup to get permission from the user 
        // to fill input device list
        const device = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: Track.INPUT_DEVICE_ID,
                channelCount: 2,
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                latency: 0,
            },
        });

        device.getTracks().forEach((track) => {
            this.currentDeviceId = track.getSettings().deviceId;
        });

        Track.INPUT_DEVICE_ID = this.currentDeviceId;

        const devices = await navigator.mediaDevices.enumerateDevices();
        const deviceSelector = document.getElementById("input-device-selector");
        devices.forEach((device) => {
            let opt = document.createElement("option");
            opt.value = device.deviceId;
            opt.innerHTML = device.label;
            console.log(device);

            deviceSelector.appendChild(opt);
        });

        deviceSelector.onchange = () => {
            console.log(`selected audio device id: ${deviceSelector.value} label: ${deviceSelector.options[deviceSelector.selectedIndex].label}`);
        };

        deviceSelector.value = this.currentDeviceId;

        if (this.audioContext.audioWorklet === undefined) {
            log("No AudioWorklet.");
        } else {
            if (this.audioContext.audioWorklet === undefined) {
                log("No AudioWorklet available.");
                return;
            }

            const url = await URLFromFiles([
                "js/track-processor.js",
                "node_modules/ringbuf.js/dist/index.js",
            ]);
            await this.audioContext.audioWorklet.addModule(url);
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    loadTrackConfig(configFileName) {
        const request = new XMLHttpRequest();
        request.open("GET", configFileName);
        request.onload = function () {
            const trackModel = JSON.parse(request.responseText);
            setupAudioRoutingGraph(trackModel);
        };

        request.send();
    }

    async play() {
        // await this.#setupAudioReader(this.sabs);
        this.audioContext.resume();
    }

    stop() {
        this.audioContext.suspend();
    }

    record() {
        console.log("record...", performance.now());
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].startRecord();
        }

        if(this.audioContext.state === "suspended") {
            let resumeStart = performance.now();
            this.audioContext.resume().then(() => {
                let resumeEnd = performance.now();
                console.log("resume time: ", resumeEnd-resumeStart);
            });
        }
    }

    stopRecord() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].stopRecord();
        }
    }

    addTrack(options) {
        const sab = exports.RingBuffer.getStorageForCapacity(
            this.audioContext.sampleRate,
            Float32Array
        );

        this.sabs.push(sab);

        let track = new Track(this.audioContext, this.store);

        track.initialize(sab);
        track.setGain(options.gain);
        track.connectToOutput(this.masterGain);

        this.tracks.push(track);
        return { id: track.id };
    }

    #findTrack(trackId) {
        for (let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            if (track.id === trackId) {
                return track;
            }
        }

        return new Track(this.audioContext, this.store);
    }

    async addFileToTrack(trackHandle, fileName, position) {
        let track = this.#findTrack(trackHandle.id);
        await track.loadFileAsClip(fileName, position);
    }

    async insertPluginToTrack(trackHandle, pluginURL) {
        let track = this.#findTrack(trackHandle.id);
        return await track.addPlugin(pluginURL);
    }

    setParameterValue(pluginHandle, parameterId, value) {
        let track = this.#findTrack(pluginHandle.trackId);
        track.setParameterValue(pluginHandle, parameterId, value);
    }

    async armForRecord(trackHandle) {
        let track = this.#findTrack(trackHandle.id);
        await track.armForRecord();
    }
}
