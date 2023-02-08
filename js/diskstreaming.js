const CHUNK_SIZE = 128;
const BUFFER_SIZE = 44160;

class Stream {
    constructor(streamID, sab) {
        this.streamID = streamID;
        this.sab = sab;
        this.clips = [];
        this.writer = new AudioWriter(new RingBuffer(sab, Float32Array));

        this.currentBuffer = null;
        this.nextBuffer = null;
        this.chunkIndex = 0;
        this.fPos = 0;
    }

    addClip(clip) {
        this.clips.push(clip);
    }

    isValid() {
        return this.sab !== null;
    }

    write(chunk) {
        this.writer.enqueue(chunk);
    }
}

class DiskStreamer {
    constructor() {
        this.chunkSize = CHUNK_SIZE;
        this.streams = [];
        this.running = false;

        this.bufferSize = BUFFER_SIZE;
        this.sampleRate = 44100;

        this.audioWriterList = [];

        this.chunk = new Float32Array(this.chunkSize);
    }

    async initialize() {
        this.store = new AudioStore();
        await this.store.init();
        return this;
    }

    addStream(streamID, sab) {
        const stream = new Stream(streamID, sab);
        this.streams.push(stream);
    }

    findStream(streamID) {
        for (let iStream = 0; iStream < this.streams.length; ++iStream) {
            const stream = this.streams[iStream];
            if (stream.streamID == streamID) {
                return stream;
            }
        }

        return new Stream(streamID); // create dummy
    }

    addClipToStream(streamID, clip) {
        const stream = this.findStream(streamID);
        if (stream.isValid()) {
            stream.addClip(clip);
        }
    }

    async prime(offset) {
        this.duration = this.bufferSize / this.sampleRate;
        this.inc = this.duration;

        for (let iStream = 0; iStream < this.streams.length; iStream++) {
            let stream = this.streams[iStream];
            stream.fPos = offset;
            stream.currentBuffer = await this.store.getAudioBuffer(stream.clips[0].fileName, stream.fPos, this.duration);
            stream.fPos += this.inc;
            stream.nextBuffer = await this.store.getAudioBuffer(stream.clips[0].fileName, stream.fPos, this.duration);
            stream.fPos += this.inc;
        }
    }

    stream() {
        this.running = true;
        const timeout = async () => {
            for (let iStream = 0; iStream < this.streams.length; iStream++) {
                const stream = this.streams[iStream];

                let chunkIndex = stream.chunkIndex;
                while (stream.writer.available_write() > this.chunkSize) {
                    const currentBuffer = stream.currentBuffer;

                    this.chunk.set(currentBuffer.getChannelData(0).slice(chunkIndex, chunkIndex + this.chunkSize))
                    console.log("write...");
                    stream.write(this.chunk);
                    chunkIndex += this.chunkSize;

                    if (chunkIndex >= this.bufferSize) {
                        [stream.currentBuffer, stream.nextBuffer] = [stream.nextBuffer, stream.currentBuffer]; // swap
                        this.store.getAudioBuffer(this.streams[iStream].clips[0].fileName, stream.fPos, this.duration).then((buffer) => {
                            stream.nextBuffer = buffer;
                        });
                        chunkIndex = 0;
                        stream.fPos += this.inc;
                    }
                }

                stream.chunkIndex = chunkIndex;
            }

            if (this.running) {
                setTimeout(timeout, 10);
            }
        }

        timeout();
    }

    stop() {
        this.running = false;
    }
}