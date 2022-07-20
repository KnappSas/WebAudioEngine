async function startPreloading(taskConfig) {
    const CHUNK_SIZE = 128;
    const chunkSize = CHUNK_SIZE;

    const tracks = taskConfig.tracks;
    const duration = taskConfig.bufferSize / 44100;
    const inc = duration;

    let chunk = new Float32Array(chunkSize);

    let audioWriterList = [];
    for (let iTrack = 0; iTrack < tracks.length; iTrack++) {
        let fPos = 0;

        currentBuffer = await store.getAudioBuffer(tracks[iTrack].clips[0].fileName, fPos, duration);
        fPos += inc;
        nextBuffer = await store.getAudioBuffer(tracks[iTrack].clips[0].fileName, fPos, duration);
        fPos += inc;

        audioWriterList[iTrack] = {
            writer: new AudioWriter(new RingBuffer(taskConfig.sabs[iTrack], Float32Array)),
            currentBuffer: currentBuffer,
            nextBuffer: nextBuffer,
            chunkIndex: 0,
            fPos: fPos
        };
    }

    const timeout = async () => {
        for (let iTrack = 0; iTrack < tracks.length; iTrack++) {
            const awl = audioWriterList[iTrack];
            const audioWriter = awl.writer;

            let chunkIndex = awl.chunkIndex;
            while (audioWriter.available_write() > chunkSize) {
                const currentBuffer = awl.currentBuffer;

                chunk.set(currentBuffer.getChannelData(0).slice(chunkIndex, chunkIndex + chunkSize))
                audioWriter.enqueue(chunk);
                chunkIndex += chunkSize;

                if (chunkIndex >= taskConfig.bufferSize) {
                    [awl.currentBuffer, awl.nextBuffer] = [awl.nextBuffer, awl.currentBuffer]; // swap
                    awl.nextBuffer = await store.getAudioBuffer(tracks[iTrack].clips[0].fileName, awl.fPos, duration);
                    chunkIndex = 0;
                    awl.fPos += inc;
                }
            }

            awl.chunkIndex = chunkIndex;
        }

        setTimeout(timeout, 1);
    }

    timeout();
}