import addFunctionModule from '@webaudiomodules/sdk/src/addFunctionModule.js';
import WamNode from '@webaudiomodules/sdk/src/WamNode.js';
import getWamExampleProcessor from './WamExampleProcessor.js';

/**
 * Object containing the most recent levels values
 * from the processor
 *
 * @typedef {Object} LevelsMap
 * @property {Float32Array} synthLevels
 * @property {Float32Array} effectLevels
 */

export default class WamExampleNode extends WamNode {
	/**
	 * Register scripts required for the processor. Must be called before constructor.
	 * @param {BaseAudioContext} audioContext
	 * @param {string} moduleId
	 */
	static async addModules(audioContext, moduleId) {
		const { audioWorklet } = audioContext;
		await super.addModules(audioContext, moduleId);
		await addFunctionModule(audioWorklet, getWamExampleProcessor, moduleId);
	}

	/**
	 * @param {WebAudioModule<WamExampleNode>} module
	 * @param {AudioWorkletNodeOptions} options
	 */
	constructor(module, options) {
		options.numberOfInputs = 1;
		options.numberOfOutputs = 1;
		options.outputChannelCount = [2];
		options.processorOptions = { useSab: true };
		super(module, options);

		/** @type {Set<WamEventType>} */
		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);

		/** @private @type {WamExampleHTMLElement} */
		this._gui = null;
	}

	/**
	 * Set / unset GUI element
	 *
	 * @param {WamExampleHTMLElement | null} element
	 */
	set gui(element) {
		this._gui = element;
	}

	/**
	 * Set parameter values for the specified parameter ids.
	 * GUI must be notified to stay synchronized.
	 * @param {WamParameterDataMap} parameterValues
	 */
	async setParameterValues(parameterValues) {
		await super.setParameterValues(parameterValues);
		this._syncGui({ parameterValues });
	}

	/**
	 * State object contains parameter settings. GUI must be
	 * notified to stay synchronized.
	 * @param {StateMap} state
	 */
	async setState(state) {
		await super.setState(state);
		this._syncGui(state);
	}

	/**
	 * Notify GUI that plugin state has changed by emitting
	 * 'wam-automation' events corresponding to each parameter.
	 * @param {StateMap} state
	 */
	_syncGui(state) {
		const type = 'wam-automation';
		Object.keys(state.parameterValues).forEach((parameterId) => {
			const data = state.parameterValues[parameterId];
			/** @type {WamAutomationEvent} */
			const event = { type, data };
			this._onEvent(event);
		});
	}

	destroy() {
		if (this._gui) this._gui.destroy();
		super.destroy();
	}
}
