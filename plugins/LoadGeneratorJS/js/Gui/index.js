export default class WamExampleHTMLElement extends HTMLElement {
	/**
	 * Creates an instance of WamExampleHTMLElement.
	 * @param {WamExamplePlugin} plugin
	 * @param {number} [scale=1.0]
	 */
	constructor(plugin, scale = 1.0) {
		super();

		this.plugin = plugin;

		this.root = this.attachShadow({ mode: 'open' });
		this.slider = document.createElement('input');
		this.slider.setAttribute("id", "load-slider");
		this.slider.type = 'range';
		this.slider.max = 1000;
		this.slider.min = 0;
		this.shadowRoot.appendChild(this.slider);

		this.shadowRoot
			.querySelector('#load-slider')
			.addEventListener('input', (e) => {
				this.plugin.audioNode.setParameterValues({
					load: {
						id: 'load',
						value: parseFloat((e.target).value / 1000),
						normalized: false,
					},
				});
			});
	}

	// name of the custom HTML element associated
	// with the plugin. Will appear in the DOM if
	// the plugin is visible
	static is() {
		return 'wam-example';
	}

	destroy() {
		window.cancelAnimationFrame(this._raf);
	}
}

if (!customElements.get(WamExampleHTMLElement.is())) {
	customElements.define(WamExampleHTMLElement.is(), WamExampleHTMLElement);
}

export { WamExampleHTMLElement };

export async function createElement(plugin, ...args) {
	return new WamExampleHTMLElement(plugin, ...args);
}
