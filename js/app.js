document.getElementById("startBtn").onclick = startAudio;
document.getElementById("stopBtn").onclick = stopAudio;

document.getElementById("startBtn").disabled = true;
document.getElementById("preloadBtn").disabled = true;

const loadSlider = document.getElementById("load-slider");

const TRACK_NUMS = [1, 2, 8, 10, 16, 32, 64, 96, 128, 256];

const trackHandles = [];
const pluginHandles = [];
const fpsLog = [];

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
        clip.fileName = "audio/sine_-12dB.wav";
        // clip.fileName = "audio/sweep.wav";
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
    const newUrl = `${window.location.origin}${window.location.pathname}?nTracks=${window.nTracks}&lang=${window.language}&option=${window.option}&streamingMode=${window.streamingMode}&load=${parseInt(loadSlider.value/10)}&nPlugins=${window.nPlugins}`;
    window.location.href = newUrl;
};

function changeNumTracks(nTracks) {
    window.nTracks = nTracks;
    reloadWithNewSettings();
}

function checkLoadGeneratorPlugin() {
    window.nPlugins = document.getElementById("addLoadGeneratorPlugin").checked ? 1 : 0;
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

function changeStreamingMode(mode) {
    window.streamingMode = mode;
    reloadWithNewSettings();
}

function preload() {
    audioEngine.forcePreLoad().then(() => {
        document.getElementById("startBtn").disabled = false;
    })
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

async function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const nTracks = urlParams.get("nTracks");
    const lang = urlParams.get("lang") || "js";
    let load = urlParams.get("load")
    if(load) {
        load = parseFloat(load) / 100;
    } else {
        load = loadSlider.value / 1000;
    }

    loadSlider.value = parseInt(load * 1000);

    const option = urlParams.get("option") || "none";
    const streamingMode = urlParams.get("streamingMode") || "AudioWorkletNode";

    let nPlugins = urlParams.get('nPlugins') || 0;
    if(nPlugins) {
        nPlugins = parseInt(nPlugins);
    }

    document.getElementById("addLoadGeneratorPlugin").checked = nPlugins > 0;

    window.nTracks = nTracks;
    window.language = lang;
    window.option = option;
    window.streamingMode = streamingMode;
    window.nPlugins = nPlugins;

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

    switch (streamingMode) {
        case "AudioWorkletNode":
            document.getElementById("choice-audioworkletnode").checked = true;
            break;
        case "AudioBufferSourceNode":
            document.getElementById("choice-audiobuffersourcenode").checked = true;
            break;
    }

    // nTrack == null would be enough probably..
    if (nTracks === null || nTracks === 'null') {
        document.getElementById("startBtn").disabled = true;
    } else {
        await audioEngine.initialize(streamingMode);

        const trackModel = createTrackConfig(nTracks);
        const numTracks = trackModel.tracks.length;
        const gainPerTrack = 1 / numTracks;

        let promises = [];
        for (let iTrack = 0; iTrack < numTracks; iTrack++) {
            let handle = await audioEngine.addTrack({ gain: gainPerTrack });
            trackHandles.push(handle);

            promises.push(audioEngine.addFileToTrack(handle, trackModel.tracks[iTrack].clips[0].fileName, 0));
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

                        audioEngine.setParameterValue(
                            pluginHandle,
                            "sqrt_block",
                            option === "sqrt-block"
                        );
                        
                        audioEngine.setParameterValue(
                            pluginHandle,
                            "sqrt_samples",
                            option === "sqrt-samples"
                        );

                        audioEngine.setParameterValue(
                            pluginHandle,
                            "use_wasm",
                            lang === "wasm"
                        );

                        audioEngine.setParameterValue(
                            pluginHandle,
                            "load",
                            load
                        );
                    });
            }
        }

        await Promise.all(promises);
        // document.getElementById("startBtn").disabled = false;
        document.getElementById("preloadBtn").disabled = false;
    }
}

initializeApp();

// document.getElementById("load-slider-label").innerHTML = "Load: 0";
function downloadBlob(content, filename, contentType) {
    // Create a blob
    var blob = new Blob([content], { type: contentType });
    var url = URL.createObjectURL(blob);

    // Create a link to download it
    var pom = document.createElement('a');
    pom.href = url;
    pom.setAttribute('download', filename);
    pom.click();
}

function exportFpsLog() {
    console.log(fpsLog);
    let csv = "fps\n";
    fpsLog.forEach((fps) => {
        csv += `${fps}\n`;
    });

    downloadBlob(csv, 'fps.csv', 'text/csv;charset=utf-8;')
}

// (() => {
//     const times = [];
//     let fps;

//     function refreshLoop() {
//         window.requestAnimationFrame(() => {
//             const now = performance.now();
//             while (times.length > 0 && times[0] <= now - 1000) {
//                 times.shift();
//             }
//             times.push(now);
//             fps = times.length;
//             refreshLoop();
//         });
//     }
//     refreshLoop();

//     // output to console once per second
//     setInterval(() => {
//         fpsLog.push(fps);
//         console.log(`fps: ${fps}`);
//     }, 1000)
// })();
