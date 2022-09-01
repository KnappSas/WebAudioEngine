import WebAudioModule from '@webaudiomodules/sdk/src/WebAudioModule.js';
import Node from './Node';

const getBaseUrl = (relativeUrl) => {
	const baseUrl = relativeUrl.href.substring(0, relativeUrl.href.lastIndexOf('/'));
	return baseUrl;
};

export default class Plugin extends WebAudioModule {
	_baseUrl = getBaseUrl(new URL('.', __webpack_public_path__));
	_descriptorUrl = `${this._baseUrl}/descriptor.json`;

	async initialize(state) {
		await this._loadDescriptor();
		return super.initialize(state);
	}

	async createAudioNode(initialState) {
		await Node.addModules(this.audioContext, this.moduleId);
		const node = new Node(this, {});
		await node._initialize();

		if (initialState) node.setState(initialState);

		return node;
	}
}
