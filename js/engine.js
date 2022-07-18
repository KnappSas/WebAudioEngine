'use strict'

const audioEnginePrototype = {
    setupAudioReader(sab, trackModel) {
        URLFromFiles(['js/audioreader.js', 'js/index.js', 'js/audiostore.js']).then((e) => {
            this.worker = new Worker(e);

            URLFromFiles(["js/audioreaderworker.js", "js/index.js", "js/audiostore.js"]).then((url) => {
                this.worker.postMessage({
                    command: "init",
                    sab: sab,
                    trackModel: trackModel,
                    workerURL: url
                });
            })

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

    async loadAudioFile(clip) {
        return new Promise((resolve, reject) => {
            if (this.decodedFileNames.includes(clip.fileName)) {
                resolve();
            } else {
                var request = new XMLHttpRequest();
                request.open('GET', clip.fileName, true);
                request.responseType = 'arraybuffer';
                request.onload = () => {
                    let audioData = request.response;
                    console.log("decodeAudioData ", clip.fileName);
                    this.audioContext.decodeAudioData(audioData, (buffer) => {
                        this.store.saveAudioBuffer(clip.fileName, buffer).then(metadata => {
                            // duration = metadata.duration;
                            resolve();
                        });
                    },
    
                        e => {
                            console.log("Error with decoding audio data" + e.err);
                            reject()
                        });
                }
    
                request.onerror = reject;
                request.send();
    
                this.decodedFileNames.push(clip.fileName);
            }
        });
    },

    async setupAudioRoutingGraph(trackModel) {
        URLFromFiles(["js/wave-processor.js", "js/index.js"]).then(async (e) => {
            if (this.audioContext.audioWorklet === undefined) {
                log("No AudioWorklet.");
            } else {
                await this.audioContext.audioWorklet.addModule(e);

                const tracks = trackModel.tracks;
                const numberOfOutputs = tracks.length;
                // 50ms of buffer, increase in case of glitches
                const sab = exports.RingBuffer.getStorageForCapacity(
                    (this.audioContext.sampleRate / 20) * numberOfOutputs,
                    Float32Array
                );

                let loadAudioFiles = async () => {
                    let promises = [];
                    for (var iTrack = 0; iTrack < numberOfOutputs; iTrack++) {
                        const track = tracks[iTrack];
                        const numClips = track.clips.length;
                        for (var iClip = 0; iClip < numClips; iClip++) {
                            const clip = track.clips[iClip];
                            promises.push(this.loadAudioFile(clip));
                        }
                    }

                    await Promise.all(promises);
                }

                loadAudioFiles().then(() => {
                    console.log("setup reader");
                    this.setupAudioReader(sab, trackModel);
                });

                const audioWorkletNode = new AudioWorkletNode(this.audioContext, "wave-processor", {
                    processorOptions: {
                        audioQueue: sab,
                    },
                    numberOfOutputs: numberOfOutputs
                });

                let masterGain = this.audioContext.createGain();
                for (let iOutput = 0; iOutput < numberOfOutputs; iOutput++) {
                    let gain = this.audioContext.createGain();
                    gain.gain.value = 1 / numberOfOutputs;
                    audioWorkletNode.connect(gain, iOutput);
                    gain.connect(masterGain).connect(this.audioContext.destination);
                }

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
            }
        });
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
}

Object.assign(AudioEngine.prototype, audioEnginePrototype);
