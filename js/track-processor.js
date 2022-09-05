const exports = {};

class TrackProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    constructor(options) {
        super(options);
        this.buffer = new Float32Array(128 * options.numberOfOutputs);
        const { audioQueue } = options.processorOptions;
        this._audio_reader = new AudioReader(
            new RingBuffer(audioQueue, Float32Array)
        );
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        // mono buffer with 128 samples
        this._audio_reader.dequeue(this.buffer);
        for (let iOutput = 0; iOutput < outputs.length; iOutput++) {
            for (let iChannel = 0; iChannel < outputs[iOutput].length; iChannel++) {
                for(let iSample = 0; iSample < outputs[iOutput][iChannel].length; iSample++) {
                    outputs[iOutput][iChannel][iSample] = this.buffer[iSample];
                    if(input.length) {
                        outputs[iOutput][iChannel][iSample] = input[iChannel % input.length][iSample];
                    }
                }
            }
        }

        return true;
    }
}

registerProcessor("track-processor", TrackProcessor);
