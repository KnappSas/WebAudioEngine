class WasmLoadProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.loadGenerator = null;

        this.port.onmessage = event => {
            if (event.data.type === "load-wasm-module") {
                console.log("load-wasm-module");

                this._size = 128;
                var instance = new WebAssembly.Instance(new WebAssembly.Module(event.data.data), { env: {} });
                this.loadGenerator = instance.exports;

                // the offset in the exported memory of the WebAssembly module
                this._inPtr = this.loadGenerator.alloc(this._size * 4);
                this._outPtr = this.loadGenerator.alloc(this._size * 4);
                // the actual buffer that is filled by the WebAssembly module
                this._inBuf = new Float32Array(this.loadGenerator.memory.buffer, this._inPtr, this._size);
                this._outBuf = new Float32Array(this.loadGenerator.memory.buffer, this._outPtr, this._size);
            }
        }
    }

    static get parameterDescriptors () {
        return [{
          name: 'load',
          defaultValue: 1,
          minValue: 0,
          maxValue: 1,
          automationRate: 'k-rate'
        }]
      }

    process(inputs, outputs, parameters) {
        if (!this.loadGenerator)
            return true;

        let output = outputs[0];
        let input = inputs[0];
        let load = parameters.load

        for (let iChannel = 0; iChannel < output.length; iChannel++) {
            for (var i = 0; i < 128; i++) {
                this._inBuf[i] = input[iChannel][i];
            }
            this.loadGenerator.generate(this._inPtr, this._outPtr, output[iChannel].length, load[0]);
            output[iChannel].set(this._outBuf);
        }

        return true;
    }
}

registerProcessor('load-processor-wasm', WasmLoadProcessor);