import addFunctionModule from '@webaudiomodules/sdk/src/addFunctionModule.js';
import WamNode from '@webaudiomodules/sdk/src/WamNode.js';
import getProcessor from './Processor.js';

export default class Node extends WamNode {
	static async addModules(audioContext, moduleId) {
		const { audioWorklet } = audioContext;
		await super.addModules(audioContext, moduleId);
		await addFunctionModule(audioWorklet, getProcessor, moduleId);
	}

	constructor(module, options) {
		options.numberOfInputs = 1;
		options.numberOfOutputs = 1;
		options.outputChannelCount = [2];
		options.processorOptions = { useSab: true };
		super(module, options);

		this._supportedEventTypes = new Set(['wam-automation', 'wam-midi']);
	}
}
