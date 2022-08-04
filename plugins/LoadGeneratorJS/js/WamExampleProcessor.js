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
			let output = outputs[0];
			let input = inputs[0];
			if (input.length < 1) return;

			// load is k-rate param
			let load = this._parameterInterpolators.load.values[startSample];
			load = load <= 0 ? 0.001 : load;

			let iterations = Math.floor(load * 10000);   
			let gain_compensation = 1 / iterations;
			
			for (let iChannel = 0; iChannel < output.length; iChannel++) {
				for (var j = 0; j < iterations; j++) {
					for (var iSample = 0; iSample < output[iChannel].length; iSample++) {
						output[iChannel][iSample] += input[iChannel % input.length][iSample] * gain_compensation;
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
