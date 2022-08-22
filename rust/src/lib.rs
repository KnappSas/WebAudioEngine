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
pub extern "C" fn generate(in_ptr: *mut f32, out_ptr: *mut f32, size: usize) {
    let in_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(in_ptr, size) };
    let out_buf: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr, size) };
    
    out_buf.clone_from_slice(in_buf);
}
