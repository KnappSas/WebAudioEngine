'use strict'

class DiskStreamerSkeleton {
    constructor(context) {
        this.context = context;
        this.diskStreamer = new DiskStreamer();
    }

    postReady() {
        this.context.postMessage({command: "ready"});
    }

    async dispatch(message) {
        switch (message.command) {
            case "initialize": {
                await this.diskStreamer.initialize();
                this.postReady();
                break;
            }
            case "addStream": {
                this.diskStreamer.addStream(message.streamID, message.sab);
                this.postReady();
                break;
            }
            case "addClipToStream": {
                this.diskStreamer.addClipToStream(message.streamID, message.clip);
                this.postReady();
                break;
            }
            case "prime": {
                await this.diskStreamer.prime(message.offset);
                this.postReady();
                break;
            }
            case "stream": {
                this.diskStreamer.stream();
                this.postReady();
                break;
            }
            case "stop": {
                this.diskStreamer.stop();
                this.postReady();
            }
            default: {
                throw Error("Unknown case in diskstreamingworker.js");
            }
        }
    }
}

const skeleton = new DiskStreamerSkeleton(self);
onmessage = (e) => {
    console.log("onmessage: ", e.data);  
    skeleton.dispatch(e.data);
};