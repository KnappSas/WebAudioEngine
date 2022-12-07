"use strict";

// import AudioStore from '@audiostore/lib/audiostore.js';
// import { RingBuffer } from 'ringbuf.js';
// import Track from "./track.js";
// import URLFromFiles from "../utils.js";

const AEPlaybackMode = {
    kScheduleFromMainThread: "AudioBufferSourceNode",
    kStreamWithAudioWorkletNode: "AudioWorkletNode"
};

class AudioEngine {
    constructor() {
        this.playbackMode = AEPlaybackMode.kStreamWithAudioWorkletNode;

        this.decodedFileNames = [];
        this.tracks = [];
        this.sabs = [];

        this.masterGain = null;

        this.currentDeviceId = "";
    }

    async forcePreLoad() {
        this.streamCoordinator.load();
    }

    async initialize(playbackMode = AEPlaybackMode.kStreamWithAudioWorkletNode) {
        this.playbackMode = playbackMode;

        this.audioContext = new AudioContext();
        this.audioContext.resume();

        console.log("audioContext.sampleRate: ", this.audioContext.sampleRate);
        console.log("audioContext.baseLatency: ", this.audioContext.baseLatency);
        console.log("audioContext.outputLatency: ", this.audioContext.outputLatency);

        this.store = new AudioStore(this.audioContext);
        this.store.init();

        AudioWorkletStreamer.initializeAudioWorkletStreamingWorker();
        this.streamCoordinator = new StreamCoordinator([], this.store, this.audioContext, this.playbackMode);

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
        this.streamCoordinator.stream(null);
    }

    stop() {
        this.streamCoordinator.stop();
    }

    seek(pos) {
        this.streamCoordinator.seek(pos);
    }

    record() {
        console.log("record...", performance.now());
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].startRecord();
        }
    }

    stopRecord() {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].stopRecord();
        }
    }

    async addTrack(options) {
        let track = new Track(this.audioContext, this.store, this.streamCoordinator);
        await track.initialize();
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
