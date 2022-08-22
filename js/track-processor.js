const exports = {};

class TrackProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    constructor(options) {
        super(options);
        this.buffer = new Float32Array(128 * options.numberOfOutputs);
        const { audioQueue, wasm } = options.processorOptions;
        this._audio_reader = new AudioReader(
            new RingBuffer(audioQueue, Float32Array)
        );

        if (wasm) {
            console.log("load-wasm-module");

            this._size = 128;
            var instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: {} });
            this.trackNode = instance.exports;

            // the offset in the exported memory of the WebAssembly module
            this._inPtr = this.trackNode.alloc(this._size * 4);
            this._outPtr = this.trackNode.alloc(this._size * 4);
            // the actual buffer that is filled by the WebAssembly module
            this._inBuf = new Float32Array(this.trackNode.memory.buffer, this._inPtr, this._size);
            this._outBuf = new Float32Array(this.trackNode.memory.buffer, this._outPtr, this._size);
        }
    }

    process(inputs, outputs, parameters) {
        this._audio_reader.dequeue(this._inBuf);
        for (let iOutput = 0; iOutput < outputs.length; iOutput++) {
            for (let iChannel = 0; iChannel < outputs[iOutput].length; iChannel++) {
                this.trackNode.generate(this._inPtr, this._outPtr, outputs[iOutput][iChannel].length);
                outputs[iOutput][iChannel].set(this._outBuf);
            }
        }

        return true;
    }

    // process(inputs, outputs, parameters) {
    //     this._audio_reader.dequeue(this.buffer);
    //     for (let iOutput = 0; iOutput < outputs.length; iOutput++) {
    //         for (let iChannel = 0; iChannel < outputs[iOutput].length; iChannel++) {
    //             let sliceStart = iOutput+iChannel * 128;
    //             let sliceEnd =  sliceStart+128;
    //             outputs[iOutput][iChannel].set(this.buffer.slice(sliceStart, sliceEnd));
    //         }
    //     }

    //     return true;
    // }

    // process(inputs, outputs, parameters) {
    //     this._audio_reader.dequeue(this.buffer);
    //     for(let iOutput = 0; iOutput < outputs.length; iOutput++) {
    //         for(let iChannel = 0; iChannel < outputs[iOutput].length; iChannel++) {
    //             for (let iSample = 0; iSample < outputs[iOutput][iChannel].length; iSample++) {
    //                 let index = iSample+128*(iOutput+iChannel);
    //                 outputs[iOutput][iChannel][iSample] = this.buffer[index];
    //             }
    //         }
    //     }

    //     return true;
    // }
}

registerProcessor("track-processor", TrackProcessor);
