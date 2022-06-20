'use strict';

class AudioBuffer {
    constructor(numberOfChannels, length, sampleRate) {
        this.channelData = [];
        for (var i = 0; i < numberOfChannels; i++) {
            this.channelData.push(new Float32Array(length));
        }

        sampleRate;
        length;
    }

    getChannelData(iChannel) {
        return this.channelData[iChannel];
    }
}

class DB {

    /**
     * DB constructor
     *
     * @method constructor
     *
     * @return {DB}
     */

    constructor() {
        this.name = 'AudioStore';
        this.version = 1;
    }

    /**
     * initialize the database
     *
     * @method init
     *
     * @return {Promise} – resolves with a DB instance
     */

    init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.name, this.version);

            let exists = true;

            req.onsuccess = ev => {
                if (exists) {
                    const log = `database ${this.name} v${this.version} exists`;
                    // console.info(log);
                    this.db = ev.target.result;
                    resolve(this);
                }
            };

            req.onupgradeneeded = ev => {
                this.db = ev.target.result;

                if (this.db.version === this.version) {
                    exists = false;
                    this.#createStores(this.db).then(() => {
                        const log = `database ${this.name} v${this.version} created`;
                        // console.info(log);
                        resolve(this);
                    });
                }
            };

            req.onerror = reject;
        });
    }

    /**
     * create database stores
     *
     * @private createStores
     *
     * @param  {IndexedDB} db – IndexedDB instance
     * @return {Promise}      – resolves with IndexedDB instance
     */

    #createStores(db) {
        return new Promise((resolve, reject) => {
            const chunks = db.createObjectStore('chunks', { keyPath: 'id' });
            const meta = db.createObjectStore('metadata', { keyPath: 'name' });

            chunks.createIndex('id', 'id', { unique: true });
            meta.createIndex('name', 'name', { unique: true });

            // these share a common transaction, so no need to bind both
            chunks.transaction.oncomplete = () => resolve(db);
            chunks.transaction.onerror = reject;
        });
    }

    /**
     * get a record from the database
     *
     * @method getRecord
     *
     * @param  {String}  storename – the objectStore name
     * @param  {String}  id        – the record's id
     * @return {Promise}            – resolves with a record
     */

    getRecord(storename, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storename, 'readwrite');
            const store = transaction.objectStore(storename);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });
    }

    /**
     * save an array of records to the database
     *
     * @method saveRecords
     *
     * @param  {String}   storename – the objectStore name
     * @param  {array}    records   – array of records to upsert
     * @return {Promise}            – resolves with `true`
     */

    saveRecords(storename, records) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storename, 'readwrite');
            const store = transaction.objectStore(storename);

            records.forEach(record => store.put(record));

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = reject;
        });
    }
}

class AudioStore {

    /**
     * AudioStore constructor
     *
     * @method constructor
     *
     * @param  {Object}       [opts={}] – optional options object
     * @return {AudioStore}
     */

    constructor(opts = {}) {
        Object.assign(this, { db: new DB(), duration: 1 });
        // console.log("constructor")
        // mobile Safari throws up when saving blobs to indexeddb :(
        this.blobs = !/iP(ad|hone|pd)/.test(navigator.userAgent);

        Object.assign(this, opts);
    }

    /**
     * Initialize the database
     *
     * @method init
     *
     * @return {Promise} – Promise that resolves with an AudioStore
     */

    async init() {
        await this.db.init();
        return this;
    }

    /**
     * get a chunk from the given file name and the given offset
     *
     * @private getChunk
     *
     * @param  {String}  name    – file name
     * @param  {String}  seconds – chunk offset in seconds
     * @return {Promise}         – resolves with a chunk record
     */

    async #getChunk(name, seconds) {
        // console.log("seconds: ", seconds);

        if (seconds % this.duration !== 0) {
            const msg = `${seconds} is not divisible by ${this.duration}`;
            throw new Error(msg);
        }

        const id = `${name}-${seconds}`;
        const chunk = await this.db.getRecord('chunks', id);

        return this.#parseChunk(chunk);
    }

    /**
     * read a chunk and replace blobs with Float32Arrays
     *
     * @private parseChunk
     *
     * @param  {Object} chunk – chunk record
     * @return {Object}       – transformed chunk record
     */

    async #parseChunk(chunk) {
        return new Promise((resolve, reject) => {
            if (!this.blobs) {
                chunk.channels = chunk.channels.map(channel => {
                    return this.#stringToFloat32Array(channel);
                });
                resolve(chunk);
            } else {
                const channels = [];

                let count = 0;

                for (let i = 0; i < chunk.channels.length; ++i) {
                    const reader = new FileReader();

                    reader.onload = function () {
                        channels[i] = new Float32Array(this.result);

                        if (++count === chunk.channels.length) {
                            chunk.channels = channels;
                            resolve(chunk);
                        }
                    };

                    reader.onerror = reject;

                    reader.readAsArrayBuffer(chunk.channels[i]);
                }

            }
        });
    }

    /**
     * save a metadata object
     *
     * @private saveMetadata
     *
     * @param  {Object}  record – track metadata
     * @return {Promise}        – resolves with `true`
     */

    async #saveMetadata(record) {
        return this.db.saveRecords('metadata', [record]);
    }

    /**
     * save an array of chunk data
     *
     * @private saveMetadata
     *
     * @param  {object}  chunks – chunk data
     * @return {Promise}        – resolves with `true`
     */

    async #saveChunks(records) {
        return this.db.saveRecords('chunks', records);
    }

    /**
     * convert an AudioBuffer to a metadata object
     *
     * @private audioBufferToMetadata
     *
     * @param  {String}       name – track name
     * @param  {AudioBuffer}  ab   – AudioBuffer instance
     * @return {Object}            – metadata object
     */

    #audioBufferToMetadata(name, ab) {
        const channels = ab.numberOfChannels;
        const rate = ab.sampleRate;
        const duration = ab.duration;
        const chunks = Math.ceil(duration / this.duration);
        return { name, channels, rate, duration, chunks };
    }

    /**
     * convert an AudioBuffer to an array of chunk objects
     *
     * @private audioBufferToRecords
     *
     * @param  {String}       name – track name
     * @param  {AudioBuffer}  ab   – AudioBuffer instance
     * @return {Array}             – array of chunk objects
     */

    #audioBufferToRecords(name, ab) {
        const channels = ab.numberOfChannels;
        const rate = ab.sampleRate;
        const chunk = rate * this.duration;
        const samples = ab.duration * rate;
        const records = [];
        const channelData = [];

        for (let i = 0; i < channels; ++i) {
            channelData.push(ab.getChannelData(i));
        }

        for (let offset = 0; offset < samples; offset += chunk) {
            const length = Math.min(chunk, samples - offset);
            const seconds = offset / ab.sampleRate;
            const id = `${name}-${seconds}`;
            const record = { id, name, rate, seconds, length };

            record.channels = channelData.map(data => {
                // 4 bytes per 32-bit float...
                const byteOffset = offset * 4;
                const buffer = new Float32Array(data.buffer, byteOffset, length);

                if (!this.blobs) {
                    return this.#float32ArrayToString(buffer);
                } else {
                    return new Blob([buffer]);
                }
            });

            records.push(record);
        }

        return records;
    }

    /**
     * merge an array of chunk records into an audiobuffer
     *
     * @private mergeChunks
     *
     * @param  {Array}       chunks   – array of chunk records
     * @param  {Object}      metadata – metadata record
     * @param  {Number}      start    – start offset in samples
     * @param  {Number}      end      – end offset in samples
     * @return {AudioBuffer}
     */

    #mergeChunks(chunks, metadata, start, end) {
        // console.log(chunks);
        const merged = [];
        const length = chunks.reduce((a, b) => a + b.length, 0);
        const samples = end - start;
        const rate = metadata.rate;

        // console.log("length: ", length);
        for (let i = 0; i < metadata.channels; ++i) {
            merged[i] = new Float32Array(chunks.length*rate*this.duration);
        }

        // console.log("chunks: ", chunks);
        for (let i = 0, index = 0; i < chunks.length; ++i) {
            merged.forEach((channel, j) => {
                merged[j].set(chunks[i].channels[j], index);
            });
            index += chunks[i].length;
        }

        // console.log("merged: ", merged);

        const channels = merged.map(f32 => f32.subarray(start, end));
        // console.log("channels: ", channels);
        const ab = new AudioBuffer(channels.length, samples, rate);
        channels.forEach((f32, i) => {
            ab.getChannelData(i).set(f32);
            // for(let i = 0; i < f32.length; i++) {
            //     const channel_data = ab.getChannelData(0);
            //     channel_data[i] = f32[i];
            //  }
        });

        // console.log("ab: ", ab);

        return ab;
    }

    /**
     * convert a Float32Array to a utf-16 String
     *
     * @private float32ArrayToString
     *
     * @param  {Float32Array} f32 – audio data
     * @return {String}           – encoded audio data
     */

    #float32ArrayToString(f32) {
        const { byteOffset, byteLength } = f32;

        const i16 = new Uint16Array(f32.buffer, byteOffset, byteLength / 2);

        // this is WAY faster when we can use it
        if ('TextDecoder' in window) {
            const decoder = new TextDecoder('utf-16');
            return decoder.decode(i16);
        }

        let str = '';

        // reduce string concatenations by getting values for a bunch of
        // character codes at once. can't do 'em all in one shot though,
        // because we'll blow out the call stack.
        for (let i = 0, len = i16.byteLength; i < len; i += 10000) {
            const length = Math.min(i + 10000, len - i);
            str += String.fromCharCode.apply(null, i16.subarray(i, length));
        }

        return str;
    }

    /**
     * convert a utf-16 string to a Float32Array
     *
     * @private stringToFloat32Array
     *
     * @param  {String}       str – encoded audio data
     * @return {Float32Array}     – decoded audio data
     */

    #stringToFloat32Array(str) {
        const i16 = new Uint16Array(str.length);

        for (let i = 0, len = i16.length; i < len; ++i) {
            i16[i] = str.charCodeAt(i);
        }

        const f32 = new Float32Array(i16.buffer);

        return f32;
    }

    /**
     * get metadata for the given track name
     *
     * @method getMetadata
     *
     * @param  {String} name – track name
     * @return {Object}      – metadata record
     */

    async getMetadata(name) {
        return this.db.getRecord('metadata', name);
    }

    /**
     * save an AudioBuffer to the database in chunks
     *
     * @method saveAudioBuffer
     *
     * @param  {String}      name – track name
     * @param  {AudioBuffer} ab   – AudioBuffer instance
     * @return {Promise}          – resolves with `true`
     */

    async saveAudioBuffer(name, ab) {
        // console.info(`saving audiobuffer ${name}`);

        const chunks = this.#audioBufferToRecords(name, ab);
        const metadata = this.#audioBufferToMetadata(name, ab);

        await this.#saveChunks(chunks);
        await this.#saveMetadata(metadata);

        // console.info(`saved audiobuffer ${name}`);

        return metadata;
    }

    // /**
    //  * get an AudioBuffer for the given track name
    //  *
    //  * this method will automatically stitch together multiple chunks
    //  * if necessary, we well as perform any trimming needed for
    //  * `offset` and `duration`.
    //  *
    //  * @method getAudioBuffer
    //  *
    //  * @param  {String}       name          – track name
    //  * @param  {Number}       [offset=0]    – offset in seconds
    //  * @param  {Number}       [duration=10] – duration in seconds
    //  * @return {Promise}                    – resolves with an AudioBuffer
    //  */

    //  async getAudioBufferFromSamplePos(name, offsetSamples = 0, numSamples = 1) {
    //     let offset = offsetSamples * this.rate;
    //     let duration = numSamples * this.rate;

    //     const start = offset;
    //     const end = offset + duration;
    //     const log = `getting audiobuffer ${name} @ ${start}s-${end}s`;

    //     // console.info(log);

    //     const metadata = await this.getMetadata(name);

    //     if (offset + duration > metadata.duration) {
    //         const msg = `${end} is beyond track duration ${metadata.duration}`;
    //         throw new Error(msg);
    //     }

    //     const rate = metadata.rate;
    //     const seconds = Math.floor(offset / this.duration) * this.duration;
    //     const samples = Math.ceil(duration * rate);
    //     const promises = [];

    //     offset -= seconds;

    //     const first = Math.floor(offset * rate);
    //     const last = first + samples;

    //     let sec = seconds;

    //     while (sec - offset < seconds + duration) {
    //         promises.push(this.#getChunk(name, sec));
    //         sec += this.duration;
    //     }

    //     const chunks = await Promise.all(promises);
    //     // console.log("chnks:", chunks);
    //     const ab = this.#mergeChunks(chunks, metadata, first, last);
    //     const msg = `got audiobuffer ${name} @ ${start}s-${end}s`;

    //     // console.info(msg);

    //     return ab;
    // }

    /**
     * get an AudioBuffer for the given track name
     *
     * this method will automatically stitch together multiple chunks
     * if necessary, we well as perform any trimming needed for
     * `offset` and `duration`.
     *
     * @method getAudioBuffer
     *
     * @param  {String}       name          – track name
     * @param  {Number}       [offset=0]    – offset in seconds
     * @param  {Number}       [duration=10] – duration in seconds
     * @return {Promise}                    – resolves with an AudioBuffer
     */

    async getAudioBuffer(name, offset = 0, duration = 1) {
        const start = offset;
        const end = offset + duration;
        const log = `getting audiobuffer ${name} @ ${start}s-${end}s`;

        // console.info(log);

        const metadata = await this.getMetadata(name);

        if (offset + duration > metadata.duration) {
            const msg = `${end} is beyond track duration ${metadata.duration}`;
            throw new Error(msg);
        }

        const rate = metadata.rate;
        const seconds = Math.floor(offset / this.duration) * this.duration;
        const samples = Math.ceil(duration * rate);
        const promises = [];

        offset -= seconds;

        const first = Math.floor(offset * rate);
        const last = first + samples;

        let sec = seconds;

        while (sec - offset < seconds + duration) {
            promises.push(this.#getChunk(name, sec));
            sec += this.duration;
        }

        const chunks = await Promise.all(promises);
        // console.log("chnks:", chunks);
        const ab = this.#mergeChunks(chunks, metadata, first, last);
        const msg = `got audiobuffer ${name} @ ${start}s-${end}s`;

        // console.info(msg);

        return ab;
    }
}