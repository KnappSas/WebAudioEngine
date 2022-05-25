/** @type {HTMLDivElement} */
const mount = document.querySelector('#mount');
// Safari...
/** @type {typeof AudioContext} */
const AudioContext = window.AudioContext // Default
	|| window.webkitAudioContext; // Safari and old versions of Chrome;

const audioContext = new AudioContext();
window.audioContext = audioContext;

let synthPluginInstance = null;

(async () => {
	// Init WamEnv
	const { default: apiVersion } = await import("../../api/src/version.js");
	const { default: addFunctionModule } = await import("../../sdk/src/addFunctionModule.js");
	const { default: initializeWamEnv } = await import("../../sdk/src/WamEnv.js");
	await addFunctionModule(audioContext.audioWorklet, initializeWamEnv, apiVersion);
	const { default: initializeWamGroup } = await import("../../sdk/src/WamGroup.js");
	const hostGroupId = 'test-host';
	const hostGroupKey = performance.now().toString();
	await addFunctionModule(audioContext.audioWorklet, initializeWamGroup, hostGroupId, hostGroupKey);

	// Import WAM
	const { default: SynthPluginFactory } = await import('../src/index.js');
	synthPluginInstance = await SynthPluginFactory.createInstance(hostGroupId, audioContext);

	window.synth = synthPluginInstance;
	synthPluginInstance.audioNode.connect(audioContext.destination);
	// const synthPluginDomNode = await synthPluginInstance.createGui();
	// mount.appendChild(synthPluginDomNode);

	mount.onclick = () => audioContext.resume(); // audio context must be resumed because browser restrictions

	setInterval(() => {
		const noteEvent = { type: 'wam-midi', data: { bytes: [0x90, 60, 100] }, time: audioContext.currentTime };
		synthPluginInstance.audioNode?.scheduleEvents(noteEvent);
	}, 500);
})();
