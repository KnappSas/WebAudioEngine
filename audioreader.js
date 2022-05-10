const exports = {};

let audioWriter = null;
let trackModel = null;
let store = null;

let currentBuffer = null;
let fileReadPos = 0;

let chunk = new Float32Array(128);

// let angle_delta = (440.0 / 44100)*2.0*Math.PI;
// let current_angle = 0;

onmessage = e => {
    switch (e.data.command) {
        case "init": {
            console.log("init worker");
            audioWriter = new AudioWriter(new RingBuffer(e.data.sab, Float32Array));
            trackModel = e.data.trackModel;

            store = new AudioStore();
            store.init().then(() => {
                let fileName = trackModel.tracks[1].files[0].name;
                console.log("fileName: ", fileName);
                store.getAudioBuffer(fileName).then(ab => {
                    currentBuffer = ab;
                    const timeout = () => {
                        if (!audioWriter) {
                            return;
                        }
    
                        while (audioWriter.available_write() > 128) {
                            const channel_data = currentBuffer.getChannelData(0);
                            for (let i = 0; i < 128; i++) {
                                if (fileReadPos < channel_data.length) {
                                    chunk[i] = channel_data[fileReadPos];
                                } else {
                                    chunk[i] = 0.0;
                                }

                                // chunk[i] = Math.sin(current_angle);
                                // current_angle+=angle_delta;
                                fileReadPos++;
                            }
    
                            audioWriter.enqueue(chunk);
                        }

                        setTimeout(timeout, 10);
                    }
                 
                    timeout();
                });
            });

            break;
        }
        default: {
            throw Error("Unknown case in file_read.js");
        }
    }
}
