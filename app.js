// const MAX_NUMBER_OF_OUTPUTS = 2**16-1; // 2^16 - 1

const audioContext = new AudioContext();
const store = new AudioStore(audioContext);
store.init();

let trackModel = null;
let decodedFiles = [];

function setupFileReadWorker(sab, trackModel) {
    URLFromFiles(['audioreader.js', 'index.js', 'audiostore.js']).then((e) => {
        worker = new Worker(e);
        worker.postMessage({
            command: "init",
            sab: sab,
            trackModel: trackModel,
        });
    });
}

function setupAudioRoutingGraph(trackModel) {
    URLFromFiles(["processor.js", "index.js"]).then((e) => {
        if (audioContext.audioWorklet === undefined) {
            log("No AudioWorklet.");
        } else {
            audioContext.audioWorklet.addModule(e).then(() => {
                const tracks = trackModel.tracks;
                const numberOfOutputs = tracks.length;
                // 50ms of buffer, increase in case of glitches
                const sab = exports.RingBuffer.getStorageForCapacity(
                    (audioContext.sampleRate / 20) * numberOfOutputs,
                    Float32Array
                );

                async function loadAudioFiles() {
                    for (var iTrack = 0; iTrack < numberOfOutputs; iTrack++) {
                        const track = tracks[iTrack];
                        const numFiles = track.files.length;
                        for (var iFile = 0; iFile < numFiles; iFile++) {
                            const file = track.files[iFile];

                            await loadAudioFile(file, (buffer) => {
                                store.saveAudioBuffer(file.name, buffer).then(metadata => {
                                    duration = metadata.duration;
                                    console.log("finished");
                                });
                            });
                        }
                    }
                }

                loadAudioFiles().then(() => {
                    
                    //setupFileReadWorker(sab, trackModel);
                });

                const audioWorkletNode = new AudioWorkletNode(audioContext, "processor", {
                    processorOptions: {
                        audioQueue: sab,
                    },
                    numberOfOutputs: numberOfOutputs
                });

                audioWorkletNode.connect(audioContext.destination);

                navigator.mediaDevices.getUserMedia({
                    audio: {
                        // echoCancellation: false,
                        autoGainControl: false,
                        noiseSuppression: false,
                        latency: 0
                    }
                }).then(userMedia => {
                    const input = audioContext.createMediaStreamSource(userMedia);
                    input.connect(audioWorkletNode);
                }
                )
            });
        }
    });
}

function loadAudioFile(file, cb) {
    var request = new XMLHttpRequest();
    request.open('GET', file.name, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        var audioData = request.response;
        audioContext.decodeAudioData(audioData, function (buffer) {
            cb(buffer);
        },

            function (e) { console.log("Error with decoding audio data" + e.err); });
    }

    request.send();
}

function loadTrackConfig(jsonObj) {
    trackModel = jsonObj;

    // function loadFilesConfig(track) {
    //     const files = track.files;
    //     for (var i = 0; i < tracks.length; i++) {
    //         console.log(files[i].name);
    //     }
    // }

    // for (var i = 0; i < tracks.length; i++) {
    //     console.log(tracks[i].id);
    //     loadFilesConfig(tracks[i]);
    // }
}

const request = new XMLHttpRequest();
request.open("GET", "config.json");
request.onload = function () {
    var configFile = JSON.parse(request.responseText);
    loadTrackConfig(configFile);
    setupAudioRoutingGraph(trackModel);
}

request.send();

