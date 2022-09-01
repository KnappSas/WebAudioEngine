/* tslint:disable */
/* eslint-disable */
/**
* @param {number} size
* @returns {number}
*/
export function alloc(size: number): number;
/**
* @param {number} in_ptr
* @param {number} out_ptr
* @param {number} size
* @param {number} load
* @param {boolean} sqrt_block
* @param {boolean} sqrt_samples
*/
export function generate(in_ptr: number, out_ptr: number, size: number, load: number, sqrt_block: boolean, sqrt_samples: boolean): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly alloc: (a: number) => number;
  readonly generate: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
}

/**
* Synchronously compiles the given `bytes` and instantiates the WebAssembly module.
*
* @param {BufferSource} bytes
*
* @returns {InitOutput}
*/
export function initSync(bytes: BufferSource): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path: InitInput | Promise<InitInput>): Promise<InitOutput>;
