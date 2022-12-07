class AudioWorkletStreamer {
  static nextID = 0;
  static getNextID() {
    return AudioWorkletStreamer.nextID++;
  }

  static diskStreamingWorker = null;
  static nTracksPerWorker = -1;
  static nRestTracksForWorker = -1

  static primeDone = false;
  static streamDone = false;

  static async initializeAudioWorkletStreamingWorker() {
    const EXPORTS_PATH = "js/exports.js";
    const WORKER_PATH = "js/diskstreamingworker.js";
    const AUDIO_STORE_PATH = "node_modules/@audiostore/lib/index.js";
    const AUDIO_WRITER_PATH = "node_modules/ringbuf.js/dist/index.js";
    const DISKSTREAMING_PATH = "js/diskstreaming.js";

    const url = await URLFromFiles([
      EXPORTS_PATH,
      AUDIO_STORE_PATH,
      AUDIO_WRITER_PATH,
      DISKSTREAMING_PATH,
      WORKER_PATH,
    ]);

    AudioWorkletStreamer.diskStreamingWorker = new Worker(url);
  }

  constructor(url, store, ac) {
    this.ac = ac;
    this.store = store;
    this.diskStreaming = null;

    this.clips = [];
    this.url = "undefined";
    this.name = "";
    if (url) {
      if (url.length > 0) {
        this.url = url;
        this.name = url.split('/').pop().split('.')[0];
      }

      const tmpClip = {fileName: url};
      this.clips.push(tmpClip);    
    }

    this.startTime = null;
    this.startOffset = null;

    this.stopped = true;
    this.ready = false;

    this.sabs = [];
  }

  nameFromUrl(url) {
    return url.split('/').pop().split('.')[0];
  }

  async initialize(audioContext) {
    this.streamID = AudioWorkletStreamer.getNextID();
    const sab = exports.RingBuffer.getStorageForCapacity(
      audioContext.sampleRate / 10,
      Float32Array
    );
    this.sabs.push(sab);

    this.trackNode = new AudioWorkletNode(
      audioContext,
      "workletstream-processor",
      {
          processorOptions: {
              audioQueue: sab,
          },
      }
  );

    this.diskStreaming = new DiskStreamerStub(AudioWorkletStreamer.diskStreamingWorker);
    await this.diskStreaming.initialize();
    await this.diskStreaming.addStream(this.streamID, sab);
  }

  async prime(offset) {
    if(!AudioWorkletStreamer.primeDone)
      this.diskStreaming.prime(offset);
    return this;
  }

  /**
   * Begin playback at the supplied offset (or resume playback)
   *
   * @method stream
   *
   * @param  {Number} offset – offset in seconds (defaults to 0 or last time )
   * @return {Streamer}
   */

  stream(offset) {
    if(!AudioWorkletStreamer.streamDone) {
      this.startTime = this.ac.currentTime;
      this.diskStreaming.stream(offset);
    }
    return this;
  }

  /**
   * stop all playback
   *
   * @method stop
   *
   * @return {Streamer}
   */

  async stop() {
    if (this.stopped || !this.ready) {
      return;
    }

    AudioWorkletStreamer.primeDone = false;
    AudioWorkletStreamer.streamDone = false;

    await this.diskStreaming.stop();

    this.stopped = true;
    const elapsed = this.ac.currentTime - this.startTime;

    this.startTime = null;
    this.startOffset += elapsed;

    // console.info( `stopping ${ this.name } @ ${ this.startOffset }s` );

    if (this.startOffset >= this.duration) {
      this.startOffset = 0;
    }

    clearTimeout(this.fetchtimer);
    clearTimeout(this.logtimer);

    return this;
  }

  /**
   * return the current cursor position in seconds
   *
   * @method currentTime
   *
   * @return {Number}    – current playback position in seconds
   */

  currentTime() {
    if (this.stopped) {
      return this.startOffset;
    }

    const start = this.startTime || this.ac.currentTime;
    const offset = this.startOffset || 0;
    const elapsed = this.ac.currentTime - start;

    return offset + elapsed;
  }

  /**
   * set the current cursor position in seconds
   *
   * @method seek
   * @param  {Number}   offset – offset in seconds
   * @return {Streamer}
   */

  seek(offset) {
    if (!this.stopped) {
      this.stop();
      this.stream(offset);
    } else {
      this.startOffset = offset;
    }
  }

  addClip(clip) {
    this.clips.push(clip);
    this.diskStreaming.addClipForStream(this.streamID, clip);
  }

  /**
   * load the audio asset at `this.url`
   *
   * @method load
   *
   * @return {Promise} – resolves with `true`
   */

  async load(force = false) {
    if (!this.name || this.name.length === 0) {
      this.name = this.nameFromUrl(this.clips[0].fileName);
    }

    if (!force) {
      // console.info( `checking cache for ${ this.name }` );

      try {
        const { duration } = await this.store.getMetadata(this.name);
        // console.info( `cache hit for ${ this.name }` );
        Object.assign(this, { duration, ready: true });
        return true;
      } catch { }
    }

    // console.info( `fetching ${ this.url }` );

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // TODO: loop over all clips
      xhr.open('GET', this.clips[0].fileName, true);
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        this.ac.decodeAudioData(xhr.response, ab => {
          this.store.saveAudioBuffer(this.name, ab).then(metadata => {
            this.duration = metadata.duration;
            // console.info( `fetched ${ this.url }` );
            this.ready = true;
            resolve(true);
          }, reject);
        }, reject);
      };

      xhr.onerror = reject;

      xhr.send();
    });
  }

  getGainNode() {
    return this.trackNode;
  }
}
