const mount = document.querySelector('#mount');

// Safari...
const AudioContext = window.AudioContext // Default
	|| window.webkitAudioContext // Safari and old versions of Chrome
	|| false;

const audioContext = new AudioContext();
audioContext.suspend();

const connectInstrument = (audioNode) => {
	audioNode.connect(audioContext.destination);
}

import { default as apiVersion } from '@webaudiomodules/api/src/version';
(async () => {
	const { default: addFunctionModule } = await import("@webaudiomodules/sdk/src/addFunctionModule.js");
	const { default: initializeWamEnv } = await import("@webaudiomodules/sdk/src/WamEnv.js");
	await addFunctionModule(audioContext.audioWorklet, initializeWamEnv, apiVersion);
	const { default: initializeWamGroup } = await import("@webaudiomodules/sdk/src/WamGroup.js");
	const hostGroupId = 'test-host';
	const hostGroupKey = performance.now().toString();
	await addFunctionModule(audioContext.audioWorklet, initializeWamGroup, hostGroupId, hostGroupKey);

	// Import WAM
	const { default: PluginFactory } = await import('./index.js');
	const loadGeneratorPluginInstance = await PluginFactory.createInstance(hostGroupId, audioContext);

	const domNode = await loadGeneratorPluginInstance.createGui();
	mount.appendChild(domNode);

	const osc = audioContext.createOscillator();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(440, audioContext.currentTime); // value 

	osc
		.connect(loadGeneratorPluginInstance.audioNode)
		.connect(audioContext.destination);

	osc.start();

	mount.onclick = () => { audioContext.resume(); console.log("audioContext.resume()") }; // audio context must be resumed because browser restrictions
})();