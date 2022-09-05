class Track {
    static decodedFileNames = [];
    static ID = 0;
    static INPUT_DEVICE_ID = "";

    static BUFFER = null;

    constructor(audioContext, store, streamCoordinator = null) {
        this.audioContext = audioContext;
        this.store = store;
        this.streamCoordinator = streamCoordinator;
        this.recorder = null;
        this.recorderNode = null;
        this.chunks = [];
        this.inputNode = null;

        this.trackNode = null;
        this.gainNode = null;
        this.model = {
            clips: [],
        };
        this.plugins = [];
        this.id = Track.ID++;
    }

    initialize(sab = null) {
        if (sab) {
            this.trackNode = new AudioWorkletNode(
                this.audioContext,
                "track-processor",
                {
                    processorOptions: {
                        audioQueue: sab,
                    },
                }
            );
        } else {
            // gainNode with gain-value 1 will be optimized out at runtime
            this.trackNode = this.audioContext.createGain();
        }

        this.gainNode = this.audioContext.createGain();
        this.trackNode.connect(this.gainNode);
    }

    connectToInput(node) {
        node.connect(this.audioWorkletNode);
    }

    connectToOutput(node) {
        this.gainNode.connect(node);
    }

    setGain(gain) {
        this.gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime);
    }

    loadAudioFile(fileName) {
        return new Promise((resolve, reject) => {
            if (Track.decodedFileNames.includes(fileName)) {
                resolve();
            } else {
                let request = new XMLHttpRequest();
                request.open("GET", fileName, true);
                request.responseType = "arraybuffer";
                request.onload = () => {
                    let audioData = request.response;
                    this.audioContext.decodeAudioData(
                        audioData,
                        (buffer) => {
                            this.store
                                .saveAudioBuffer(fileName, buffer)
                                .then((metadata) => {
                                    // duration = metadata.duration;
                                    resolve();
                                });
                        },
                        (e) => {
                            console.log(
                                "Error with decoding audio data" + e.err
                            );
                            reject();
                        }
                    );
                };

                request.onerror = reject;
                request.send();

                Track.decodedFileNames.push(fileName);
            }
        });
    }

    async loadFileAsClip(fileName, position) {
        const clip = {
            fileName: fileName,
            position: position,
            startInFile: 0,
            endInFile: -1,
        };

        this.model.clips.push(clip);

        if (this.streamCoordinator) {
            const streamer = this.streamCoordinator.addURL(clip.fileName);
            streamer.gain.connect(this.trackNode);
        } else if (this.store) {
            await this.loadAudioFile(fileName);
        }
    }

    #findPlugin(pluginId) {
        for (let i = 0; i < this.plugins.length; i++) {
            let plugin = this.plugins[i];
            if (plugin.instanceId === pluginId) {
                return plugin;
            }
        }

        return null;
    }

    setParameterValue(pluginHandle, parameterId, value) {
        let plugin = this.#findPlugin(pluginHandle.pluginId);
        if (!plugin) {
            console.error("setParameterValue: plugin null or undefined");
            return;
        }

        plugin.audioNode.setParameterValues({
            [parameterId]: {
                id: parameterId,
                value: value,
                normalized: false,
            },
        });
    }

    async addPlugin(url) {
        const { default: apiVersion } = await import(
            "../node_modules/@webaudiomodules/api/src/version.js"
        );
        const { default: addFunctionModule } = await import(
            "../node_modules/@webaudiomodules/sdk/src/addFunctionModule.js"
        );
        const { default: initializeWamEnv } = await import(
            "../node_modules/@webaudiomodules/sdk/src/WamEnv.js"
        );
        await addFunctionModule(
            this.audioContext.audioWorklet,
            initializeWamEnv,
            apiVersion
        );
        const { default: initializeWamGroup } = await import(
            "../node_modules/@webaudiomodules/sdk/src/WamGroup.js"
        );
        const hostGroupId = "webaudioengine-test-host";
        const hostGroupKey = performance.now().toString();
        await addFunctionModule(
            this.audioContext.audioWorklet,
            initializeWamGroup,
            hostGroupId,
            hostGroupKey
        );

        const { default: PluginFactory } = await import(url);
        const pluginInstance = await PluginFactory.createInstance(
            hostGroupId,
            this.audioContext
        );

        let lastPluginInChain = null;
        if (this.plugins.length === 0) {
            lastPluginInChain = this.trackNode;
        } else {
            lastPluginInChain = this.plugins[this.plugins.length - 1].audioNode;
        }

        lastPluginInChain.disconnect(this.gainNode);
        lastPluginInChain.connect(pluginInstance.audioNode);
        pluginInstance.audioNode.connect(this.gainNode);

        this.plugins.push(pluginInstance);
        return { trackId: this.id, pluginId: pluginInstance.instanceId };

        // IF GUI!
        //const domNode = await loadGeneratorPluginInstance.createGui();
        //mount.appendChild(domNode);
    }

    async armForRecord() {
        // this will also activate something like 'monitoring' first,
        // not sure if recording without monitor works (?)

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

        console.log("device: ", device.getTracks()[0].getSettings());

        // this.inputNode = this.audioContext.createMediaStreamSource(device);
        this.inputNode = this.audioContext.createBufferSource();
        this.inputNode.buffer = Track.buffer;
        this.inputNode.start();
        this.inputNode.connect(this.trackNode);

        // next add record node...
        this.recorderNode = this.audioContext.createMediaStreamDestination();
        this.inputNode.connect(this.recorderNode);

        console.log("stream", this.recorderNode.stream);
        this.recorder = new MediaRecorder(this.recorderNode.stream, { mimeType: "audio/ogg; codecs=opus" });
        this.recorder.ondataavailable = (evt) => {
            console.log("ondataavailable: ", performance.now());
            // Push each chunk (blobs) in an array
            console.log(evt.data);
            this.chunks.push(evt.data);
        };

        this.recorder.onstart = (evt) => {
            let evttime = evt.timeStamp;
            let startTime = performance.now();

            let resumeStart = performance.now();
            this.audioContext.resume().then(() => {
                let resumeEnd = performance.now();
                console.log("audioContext.resume time", resumeEnd - resumeStart);
            });
            console.log("evttimestamp: ", evttime);
            console.log("onstart call time: ", startTime);
            console.log(
                "elapsed time: event to call: ",
                startTime - evt.timeStamp
            );
        };

        this.recorder.onstop = (evt) => {
            console.log("onstop: ", performance.now());

            // Make blob out of our blobs, and open it.
            const blob = new Blob(this.chunks, {
                type: "audio/ogg; codecs=opus",
            });
            document.querySelector("audio").src = URL.createObjectURL(blob);
            // need to save it to audio store
            this.chunks = [];
        };
    }

    startRecord() {
        if (!this.recorder) return;
        if (this.recorder.state === "inactive") {
            this.recorder.start();
        }
    }

    stopRecord() {
        if (!this.recorder) return;
        if (this.recorder.state === "recording") {
            this.recorder.stop();
        }
    }
}
