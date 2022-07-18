#[no_mangle]
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

#[no_mangle]
pub extern "C" fn generate(in_ptr: *mut f32, out_ptr: *mut f32, size: usize, load: f32) {
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, size) };
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, size) };
    let iterations =  (load * 1000.0) as i32;
    let gain_compensation = 1.0 / iterations as f32 ;
    for _j in 0..iterations {
        for i in 0..size {
            out_buf[i] = in_buf[i];
        }
    }
}
