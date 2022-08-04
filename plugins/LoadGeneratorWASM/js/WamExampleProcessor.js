/**
 * @param {string} moduleId
 * @returns {WamExampleProcessorConstructor}
 */
const getWamExampleProcessor = (moduleId) => {

	/** @type {AudioWorkletGlobalScope} */
	// @ts-ignore
	const audioWorkletGlobalScope = globalThis;
	const { registerProcessor } = audioWorkletGlobalScope;

	/** @type {WamExampleModuleScope} */
	const ModuleScope = audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
	const {
		WamProcessor,
		WamParameterInfo,
	} = ModuleScope;

	/**
	 * `WamExample`'s `AudioWorkletProcessor`
	 *
	 * @class
	 * @extends {WamProcessor}
	 * @implements {IWamExampleProcessor}
	 */
	class WamExampleProcessor extends WamProcessor {
		/**
		 * @param {AudioWorkletNodeOptions} options
		 */
		constructor(options) {
			super(options);
			this.loadGenerator = null;
		}

		async _onMessage(message) {
			console.log("message: ", message.data);
			if (message.data.type === "load-wasm-module") {
				console.log("load-wasm-module");

				this._size = 128;
				var instance = new WebAssembly.Instance(new WebAssembly.Module(message.data.data), { env: {} });
				this.loadGenerator = instance.exports;

				// the offset in the exported memory of the WebAssembly module
				this._inPtr = this.loadGenerator.alloc(this._size * 4);
				this._outPtr = this.loadGenerator.alloc(this._size * 4);
				// the actual buffer that is filled by the WebAssembly module
				this._inBuf = new Float32Array(this.loadGenerator.memory.buffer, this._inPtr, this._size);
				this._outBuf = new Float32Array(this.loadGenerator.memory.buffer, this._outPtr, this._size);
			}

			await super._onMessage(message);
		}

		/**
		 * Fetch plugin's params.
		 * @returns {WamParameterInfoMap}
		 */
		_generateWamParameterInfo() {
			return {
				load: new WamParameterInfo('load', {
					type: 'float',
					label: 'Load',
					defaultValue: 0.001,
					minValue: 0.0,
					maxValue: 1.0
				})
			};
		}

		/**
		 * Implement custom DSP here.
		 * @param {number} startSample beginning of processing slice
		 * @param {number} endSample end of processing slice
		 * @param {Float32Array[][]} inputs
		 * @param {Float32Array[][]} outputs
		 */
		_process(startSample, endSample, inputs, outputs) {
			if (!this.loadGenerator)
				return true;

			let output = outputs[0];
			let input = inputs[0];
			if (input.length < 1) return;

			// load is k-rate param
			let load = this._parameterInterpolators.load.values[startSample];
			load = load <= 0 ? 0.001 : load;

			for (let iChannel = 0; iChannel < output.length; iChannel++) {
				for (var iSample = 0; iSample < 128; iSample++) {
					this._inBuf[iSample] = input[iChannel % input.length][iSample];
				}
				//this.loadGenerator.generate(this._inPtr, this._outPtr, output[iChannel].length, load[0]);
				output[iChannel].set(input[iChannel% input.length]);
			}
		}
	}
	try {
		registerProcessor('WebAudioModuleWamExample', WamExampleProcessor);
	} catch (error) {
		console.warn(error);
	}

	return WamExampleProcessor;
}

export default getWamExampleProcessor;
