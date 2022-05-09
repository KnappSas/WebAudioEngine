const exports = {};

let audioWriter = null;

onmessage =  e => {
    switch (e.data.command) {
        case "init": {
            audioWriter = new AudioWriter(new RingBuffer(e.data.sab, Float32Array));

            const store = new AudioStore();
            store.init().then(() => {
                console.log("init done");
                store.getAudioBuffer("mein file 321").then(ab => {
                    console.log("audio buffer from indexedDB: ", ab);
                });
            });
            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
}
