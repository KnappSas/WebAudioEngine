class Track {
    static decodedFileNames = [];
    static ID = 0;

    constructor(audioContext, store) {
        this.audioContext = audioContext;
        this.store = store;
        this.audioWorkletNode = null;
        this.gainNode = null;
        this.model = {
            clips: []
        };
        this.plugins = [];
        this.id = Track.ID++;
    }

    async initialize(sab) {
        const p = await fetch(`${this._baseUrl}/../rust/target/wasm32-unknown-unknown/release/track_node_wasm.wasm`)
        const wasm = await p.arrayBuffer();

        this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "track-processor", {
            processorOptions: {
                audioQueue: sab,
                wasm: wasm,
            },
        });

        this.gainNode = this.audioContext.createGain();
        this.audioWorkletNode.connect(this.gainNode);
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
                var request = new XMLHttpRequest();
                request.open('GET', fileName, true);
                request.responseType = 'arraybuffer';
                request.onload = () => {
                    let audioData = request.response;
                    this.audioContext.decodeAudioData(audioData, (buffer) => {
                        this.store.saveAudioBuffer(fileName, buffer).then(metadata => {
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

                Track.decodedFileNames.push(fileName);
            }
        });
    }

    async loadFileAsClip(fileName, position, startInFile, endInFile) {
        const clip = {
            fileName: fileName,
            position: position,
            startInFile: startInFile,
            endInFile: endInFile
        };

        this.model.clips.push(clip);
        await this.loadAudioFile(fileName);
    }

    setParameterValue(pluginId, parameterId, value) {
        this.plugins[pluginId].audioNode.setParameterValues({
            load: {
                id: parameterId,
                value: parseFloat(value),
                normalized: false,
            },
        });
    }

    async addPlugin(url) {
        const { default: apiVersion } = await import('../node_modules/@webaudiomodules/api/src/version.js');
        const { default: addFunctionModule } = await import("../node_modules/@webaudiomodules/sdk/src/addFunctionModule.js");
        const { default: initializeWamEnv } = await import("../node_modules/@webaudiomodules/sdk/src/WamEnv.js");
        await addFunctionModule(this.audioContext.audioWorklet, initializeWamEnv, apiVersion);
        const { default: initializeWamGroup } = await import("../node_modules/@webaudiomodules/sdk/src/WamGroup.js");
        const hostGroupId = 'webaudioengine-test-host';
        const hostGroupKey = performance.now().toString();
        await addFunctionModule(this.audioContext.audioWorklet, initializeWamGroup, hostGroupId, hostGroupKey);

        const { default: PluginFactory } = await import(url);
        const pluginInstance = await PluginFactory.createInstance(hostGroupId, this.audioContext);

        let lastPluginInChain = null;
        if (this.plugins.length === 0) {
            lastPluginInChain = this.audioWorkletNode;
        } else {
            lastPluginInChain = this.plugins[this.plugins.length - 1].audioNode;
        }

        lastPluginInChain.disconnect(this.gainNode);
        lastPluginInChain.connect(pluginInstance.audioNode);
        pluginInstance.audioNode.connect(this.gainNode);

        this.plugins.push(pluginInstance);

        return this.plugins.length - 1;
        // IF GUI!
        //const domNode = await loadGeneratorPluginInstance.createGui();
        //mount.appendChild(domNode);
    }
};