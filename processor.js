const exports = {};

class Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    constructor(options) {
        super(options);
        this.buffer = new Float32Array(128*options.numberOfOutputs);
        const { audioQueue } = options.processorOptions;
        this._audio_reader = new AudioReader(
            new RingBuffer(audioQueue, Float32Array)
        );
    }

    process(inputs, outputs, parameters) {
        // console.log("number of inputs: ", inputs.length);
        // console.log("number input channels: ", inputs[0].length);
        // console.log("number of outputs: ", outputs.length);
        // console.log("number output channels: ", outputs[0].length);

        this._audio_reader.dequeue(this.buffer);
        for(let iOutput = 0; iOutput < outputs.length; iOutput++) {
            for(let iChannel = 0; iChannel < outputs[iOutput].length; iChannel++) {
                for (let iSample = 0; iSample < outputs[iOutput][iChannel].length; iSample++) {
                    let index = iSample+128*(iOutput+iChannel);
                    outputs[iOutput][iChannel][iSample] = this.buffer[index];
                }
            }
        }

        return true;
    }
}

registerProcessor("processor", Processor);
