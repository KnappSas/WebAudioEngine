use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = Math)]
    fn sqrt(f : f32) -> f32;
}

#[wasm_bindgen]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    let mut buf = Vec::<f32>::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    // take ownership of the memory block and
    // ensure that its destructor is not
    // called when the object goes out of scope
    // at the end of the function
    std::mem::forget(buf);
    ptr as *mut f32
}

#[wasm_bindgen]
pub extern "C" fn generate(
    in_ptr: *mut f32,
    out_ptr: *mut f32,
    size: usize,
    load: f32,
    sqrt_block: bool,
    sqrt_samples: bool,
) {
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, size) };
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, size) };
    out_buf.fill(0.0);

    // load limits: [0.001, 1.0]
    let iterations = (load * 1000.0) as i32;
    let gain_compensation = 1.0 / iterations as f32;

    if sqrt_block {
        for j in 0..iterations {
            // use j here to make sure 'a' does not get optimized
            let a = sqrt((iterations + j) as f32) * gain_compensation;
            for i in 0..size {
                out_buf[i] += in_buf[i] * gain_compensation + a;
            }
        }
    } else if sqrt_samples {
        for _j in 0..iterations {
            for i in 0..size {
                let mut a: f32 = in_buf[i];
                a = if a > 0.0 { sqrt(a) } else { -sqrt(-a) };
                out_buf[i] += a * gain_compensation;
            }
        }
    } else {
        for _j in 0..iterations {
            for i in 0..size {
                out_buf[i] += in_buf[i] * gain_compensation;
            }
        }
    }
}
