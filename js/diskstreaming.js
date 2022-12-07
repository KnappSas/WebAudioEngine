const CHUNK_SIZE = 128;
const BUFFER_SIZE = 44160;

class Stream {
    constructor(streamID, sab = null) {
        this.streamID = streamID;
        this.sab = sab;
        this.clips = [];
    }

    addClip(clip) {
        this.clips.push(clip);
    }

    isValid() {
        return this.sab !== null;
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
    }

    async initialize() {
        this.store = new AudioStore();
        await this.store.init();
        return this;
    }

    addStream(streamID, sab) {
        console.log("DiskStreamer::addStream", streamID, sab);
        const stream = new Stream(streamID, sab);
        this.streams.push(stream);
    }

    findStream(streamID) {
        for(let iStream = 0; iStream < this.streams.length; ++iStream) {
            const stream = this.streams[iStream];
            if(stream.streamID == streamID) {
                return stream;
            }
        }

        return new Stream(streamID); // create dummy
    }

    addClipToStream(streamID, clip) {
        const stream = this.findStream(streamID);
        if(stream.isValid()) {
            stream.addClip(clip);
        }
    }

    async prime(offset) {
        const duration = this.bufferSize / this.sampleRate;
        const inc = duration;

        for (let iStream = 0; iStream < this.streams.length; iStream++) {
            let fPos = offset;
    
            currentBuffer = await this.store.getAudioBuffer(this.streams[iStream].clips[0].fileName, fPos, duration);
            fPos += inc;
            nextBuffer = await this.store.getAudioBuffer(this.streams[iStream].clips[0].fileName, fPos, duration);
            fPos += inc;
    
            this.audioWriterList[iStream] = {
                writer: new AudioWriter(new RingBuffer(taskConfig.sabs[iStream], Float32Array)),
                currentBuffer: currentBuffer,
                nextBuffer: nextBuffer,
                chunkIndex: 0,
                fPos: fPos
            };
        }
    }

    stream() {
        this.running = true;
        const timeout = async () => {
            for (let iStream = 0; iStream < this.streams.length; iStream++) {
                const awl = this.audioWriterList[iStream];
                const audioWriter = awl.writer;
    
                let chunkIndex = awl.chunkIndex;
                while (audioWriter.available_write() > this.chunkSize) {
                    const currentBuffer = awl.currentBuffer;
    
                    chunk.set(currentBuffer.getChannelData(0).slice(chunkIndex, chunkIndex + this.chunkSize))
                    audioWriter.enqueue(chunk);
                    console.log("enqueue");
                    chunkIndex += this.chunkSize;
    
                    if (chunkIndex >= taskConfig.bufferSize) {
                        [awl.currentBuffer, awl.nextBuffer] = [awl.nextBuffer, awl.currentBuffer]; // swap
                        this.store.getAudioBuffer(this.streams[iStream].clips[0].fileName, awl.fPos, duration).then((buffer)=>{
                            awl.nextBuffer = buffer;
                        });
                        chunkIndex = 0;
                        awl.fPos += inc;
                    }
                }
    
                awl.chunkIndex = chunkIndex;
            }
    
            if(this.running) {
                setTimeout(timeout, 10);
            }
        }
    
        timeout();
    }

    stop() {
        this.running = false;
    }
}