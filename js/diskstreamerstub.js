class DiskStreamerStub {
    constructor(worker) {
        this.promises = [];
        this.worker = worker;
        this.worker.addEventListener('message', (e) => {
            switch (e.data.command) {
                case "ready": {
                    this.promises.forEach(p => {
                        p.resolve();
                    });

                    this.promises = [];
                    break;
                }
                default: {
                    throw Error("Unknown case in app.js");
                }
            }
        });
    }

    async initialize() {
        console.log("Diskstreamerstub::initialize");
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "initialize"
            });
        });

        await p;
    }

    async addStream(streamID, sab) {
        console.log("Diskstreamerstub::addStream");
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "addStream",
                streamID: streamID,
                sab: sab
            });
        });

        await p;
    }

    async addClipForStream(streamID, clip) {
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "addClipToStream",
                streamID: streamID,
                clip: clip
            });
        });

        await p;
    }

    async prime(offset) {
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "prime",
                offset: offset
            });
        });

        await p;
    }

    async stream() {
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "stream"
            });
        });

        await p;
    }

    async stop() {
        let p = new Promise((resolve) => {
            this.promises.push({resolve: resolve});
            this.worker.postMessage({
                command: "stop"
            });
        });

        await p;
    }
}