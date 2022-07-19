// export default class Track {
class Track {
    static decodedFileNames = [];

    constructor(audioContext, store) {
        this.audioContext = audioContext;
        this.store = store;
        this.audioWorkletNode = null;
        this.gain = null;
        this.model = {
            clips: []
        };
    }

    initialize(sab) {
        this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "wave-processor", {
            processorOptions: {
                audioQueue: sab,
            },
        });

        this.gain = this.audioContext.createGain();
        // gain.gain.value = 1 / numberOfOutputs;
        this.audioWorkletNode.connect(this.gain);
    }

    connectToInput(node) {
        node.connect(this.audioWorkletNode);
    }

    connectToOutput(node) {
        this.gain.connect(node);
    }

    async loadAudioFile(fileName) {
        return new Promise((resolve, reject) => {
            if (Track.decodedFileNames.includes(fileName)) {
                resolve();
            } else {
                var request = new XMLHttpRequest();
                request.open('GET', fileName, true);
                request.responseType = 'arraybuffer';
                request.onload = () => {
                    let audioData = request.response;
                    console.log("decodeAudioData ", fileName);
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
        return this.loadAudioFile(fileName);
    }
};