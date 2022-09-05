document.getElementById("startBtn").onclick = startAudio;
document.getElementById("stopBtn").onclick = stopAudio;
const loadSlider = document.getElementById("load-slider");

const TRACK_NUMS = [1, 2, 8, 10, 16, 32, 64, 96, 128, 256];

const trackHandles = [];
const pluginHandles = [];

for (let i = 0; i < TRACK_NUMS.length; i++) {
    const numTracks = TRACK_NUMS[i];
    document.getElementById(
        "track-section"
    ).innerHTML += `<button id=\"track-${numTracks}\">${numTracks}</button>`;
}

for (let i = 0; i < TRACK_NUMS.length; i++) {
    const numTracks = TRACK_NUMS[i];
    document.getElementById(`track-${numTracks}`).onclick = () => {
        changeNumTracks(numTracks);
    };
}

const audioEngine = new AudioEngine();

function createTrackConfig(nTracks) {
    let trackConfig = {};
    trackConfig.tracks = [];

    let samplePos = 0;
    let length = 1323000;
    let iStartInFile = 0;
    let iEndInFile = 1323000;
    for (let iTrack = 0; iTrack < nTracks; iTrack++) {
        let track = {};

        track.id = iTrack;
        track.number = iTrack + 1;
        track.lastClipIndex = 0;
        track.clips = [];

        let clip = {};
        clip.fileName = "audio/sweep.wav";
        clip.samplePos = samplePos;
        clip.length = length;
        clip.iStartInFile = iStartInFile;
        clip.iEndInFile = iEndInFile;

        track.clips.push(clip);
        trackConfig.tracks.push(track);
    }

    return trackConfig;
}

const reloadWithNewSettings = () => {
    const newUrl = `${window.location.origin}${window.location.pathname}?nTracks=${window.nTracks}&lang=${window.language}&option=${window.option}`;
    window.location.href = newUrl;
};

function changeNumTracks(nTracks) {
    window.nTracks = nTracks;
    reloadWithNewSettings();
}

function changeProcessingLanguage(lang) {
    window.language = lang;
    reloadWithNewSettings();
}

function addOption(option) {
    window.option = option;
    reloadWithNewSettings();
}

function changeProcessingLoad(load = -1) {
    const value = loadSlider.value;
    pluginHandles.forEach((pluginHandles) => {
        audioEngine.setParameterValue(pluginHandles, "load", value / 1000);
    });
}

function startAudio() {
    audioEngine.play();
    // audioEngine.armForRecord(trackHandles[0]).then(() => {
    //     audioEngine.record();
    //     //audioEngine.play();
    // });
}

function stopAudio() {
    audioEngine.stop();
    audioEngine.stopRecord();
}

function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const nTracks = urlParams.get("nTracks");
    const lang = urlParams.get("lang") || "js";
    const option = urlParams.get("option") || "none";

    // const nPlugins = urlParams.get('nPlugins');
    const nPlugins = 0;

    window.nTracks = nTracks;
    window.language = lang;
    window.option = option;

    switch (lang) {
        case "wasm":
            document.getElementById("choice-wasm").checked = true;
            break;
        case "js":
            document.getElementById("choice-js").checked = true;
            break;
    }

    switch (option) {
        case "sqrt-block":
            document.getElementById("choice-sqrt-block").checked = true;
            break;
        case "sqrt-samples":
            document.getElementById("choice-sqrt-samples").checked = true;
            break;
        case "none":
            document.getElementById("choice-none").checked = true;
            break;
    }

    if (nTracks === null) {
        document.getElementById("startBtn").disabled = true;
    } else {
        audioEngine.initialize(PlaybackMode.kStreamWithAudioWorkletNode).then(() => {
            const trackModel = createTrackConfig(nTracks);
            const numTracks = trackModel.tracks.length;

            const gainPerTrack = 1 / numTracks;

            for (let iTrack = 0; iTrack < numTracks; iTrack++) {
                let handle = audioEngine.addTrack({ gain: gainPerTrack });
                trackHandles.push(handle);

                audioEngine
                    .addFileToTrack(
                        handle,
                        trackModel.tracks[iTrack].clips[0].fileName,
                        0
                    )
                    .then(() => {
                        // audioEngine.insertPluginToTrack(
                        //     handle,
                        //     pluginCollection.get("LatencyMeasurer")
                        // );

                        for (let i = 0; i < nPlugins; i++) {
                            audioEngine
                                .insertPluginToTrack(
                                    handle,
                                    pluginCollection.get("LoadGeneratorWASM")
                                )
                                .then((pluginHandle) => {
                                    pluginHandles.push(pluginHandle);

                                    audioEngine.setParameterValue(
                                        pluginHandle,
                                        "use_wasm",
                                        lang === "wasm"
                                    );

                                    const load = loadSlider.value / 1000;
                                    audioEngine.setParameterValue(
                                        pluginHandle,
                                        "load",
                                        load
                                    );
                                });
                        }
                    });
            }

            document.getElementById("startBtn").disabled = false;
        });
    }
}

initializeApp();

// document.getElementById("load-slider-label").innerHTML = "Load: 0";

// (() => {
//     const times = [];
//     let fps;

//     function refreshLoop() {
//         window.requestAnimationFrame(() => {
//             const now = performance.now();
//         while (times.length > 0 && times[0] <= now - 1000) {
//             times.shift();
//         }
//         times.push(now);
//         fps = times.length;
//         refreshLoop();
//     });
//     }
//     refreshLoop();

//     // output to console once per second
//     setInterval(() => {console.log(fps);}, 1000)
// })();
