document.getElementById("startBtn").onclick = startAudio;
document.getElementById("stopBtn").onclick = stopAudio;

const TRACK_NUMS = [1, 2, 16, 32, 64, 128, 256];

for (let i = 0; i < TRACK_NUMS.length; i++) {
    const numTracks = TRACK_NUMS[i];
    document.getElementById("track-section").innerHTML += `<button id=\"track-${numTracks}\">${numTracks}</button>`;
}
for (let i = 0; i < TRACK_NUMS.length; i++) {
    const numTracks = TRACK_NUMS[i];
    document.getElementById(`track-${numTracks}`).onclick = () => { changeNumTracks(numTracks) };
}

const audioEngine = new AudioEngine();

document.getElementById("startBtn").disabled = true;

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

function changeNumTracks(nTracks) {
    audioEngine.setupAudioRoutingGraph().then(() => {
        const trackModel = createTrackConfig(nTracks);
        const numChannels = trackModel.tracks.length;
        for (let iTrack = 0; iTrack < numChannels; iTrack++) {
            audioEngine.addTrack({gain: 1 / numChannels});
            audioEngine.addFileToTrack(iTrack, trackModel.tracks[iTrack].clips[0].fileName);
        }

        document.getElementById("startBtn").disabled = false;
    });
}

function changeProcessingLanguage(language) {
    window.language = language;
    const newUrl = `${window.location.origin}${window.location.pathname}?strings=${window.numStrings}&visualize=${window.visualize}&channel=${window.channel}&ratio=${window.ratio}&lang=${window.language}`;
    window.location.href = newUrl;
}

function changeProcessingLoad(newLoad = -1) {
    audioEngine.changeProcessingLoad(newLoad);
}

function debug() {
    // worker.postMessage({ command: "preload debug" });
}

function startAudio() {
    audioEngine.startAudio();
}

function stopAudio() {
    audioEngine.stopAudio();
}

// const urlParams = new URLSearchParams(window.location.search);
// const lang = urlParams.get('lang') === "js"
//     ? "js"
//     : "wasm"

// window.language = lang;
// switch (lang) {
//     case "wasm": document.getElementById("choice-wasm").checked = true; break;
//     case "js": document.getElementById("choice-js").checked = true; break;
// }

// document.getElementById("load-slider-label").innerHTML = "Load: 0";