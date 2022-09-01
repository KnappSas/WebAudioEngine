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

				// this is a hack because webpack won't find the actual wasm bindings, when importing them :(
				function getImports() {
					const imports = {};
					imports.wbg = {};
					imports.wbg.__wbg_sqrt_bc634770d166a07d = typeof Math.sqrt == 'function' ? Math.sqrt : notDefined('Math.sqrt');
				
					return imports;
				}

				this._size = 128;
				var instance = new WebAssembly.Instance(new WebAssembly.Module(message.data.data), getImports());
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
				}),
				use_wasm: new WamParameterInfo('use_wasm', {
					type: 'boolean',
					label: 'use WASM audio processing',
					defaultValue: 1
				}),
				sqrt_block: new WamParameterInfo('sqrt_block', {
					type: 'boolean',
					label: 'call sqrt once per audio block',
					defaultValue: 0
				}),
				sqrt_samples: new WamParameterInfo('sqrt_samples', {
					type: 'boolean',
					label: 'call sqrt for every samples in the audio block',
					defaultValue: 0
				}),
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
			let use_wasm = this._parameterInterpolators.use_wasm.values[startSample];
			let sqrt_block = this._parameterInterpolators.sqrt_block.values[startSample];
			let sqrt_samples = this._parameterInterpolators.sqrt_samples.values[startSample];

			load = load <= 0 ? 0.001 : load;

			let iterations = Math.floor(load * 1000);
			let gain_compensation = 1 / iterations;

			// console.log("sqrt_block: ", sqrt_block, "sqrt_samples: ", sqrt_samples, "wasm: ", use_wasm);

			if (use_wasm) {
				for (let iChannel = 0; iChannel < output.length; iChannel++) {
					for (var iSample = 0; iSample < 128; iSample++) {
						this._inBuf[iSample] = input[iChannel % input.length][iSample];
					}

					this.loadGenerator.generate(this._inPtr, this._outPtr, output[iChannel].length, load, sqrt_samples, sqrt_block);
					output[iChannel].set(this._outBuf);
				}
			} else {
				for (let iChannel = 0; iChannel < output.length; iChannel++) {
					if (sqrt_block) {
						for (var j = 0; j < iterations; j++) {
							let a = Math.sqrt(iterations + j) * gain_compensation;
							for (var iSample = 0; iSample < output[iChannel].length; iSample++) {
								output[iChannel][iSample] += input[iChannel % input.length][iSample] * gain_compensation + a;
							}
						}
					} else if (sqrt_samples) {
						for (var j = 0; j < iterations; j++) {
							for (var iSample = 0; iSample < output[iChannel].length; iSample++) {
								let a = input[iChannel % input.length][iSample];
								a = a < 0.0 ? Math.sqrt(a) : -Math.sqrt(a);
								output[iChannel][iSample] += a * gain_compensation;
							}
						}
					} else {
						for (var j = 0; j < iterations; j++) {
							for (var iSample = 0; iSample < output[iChannel].length; iSample++) {
								output[iChannel][iSample] += input[iChannel % input.length][iSample] * gain_compensation;
							}
						}
					}
				}
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
