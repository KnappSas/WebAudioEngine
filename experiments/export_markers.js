// based on https://github.com/padenot/fx-profiler-audio-cb

var m = window.filteredMarkers;
if(m.length <= 0) return false;

var budgets = new Float32Array(m.length);
var idx_budgets = 0;
var callbacks = new Float32Array(m.length);
var idx_callbacks = 0;
var cb_time = new Float32Array(m.length);
var idx_cb_time = 0;
var time_base = -1;
for (var i = 0; i < m.length; i++) {
  if (m[i].name.indexOf("budget") != -1) {
    if (time_base == -1) {
      time_base = m[i].start;
    }
    cb_time[idx_cb_time++] = m[i].start - time_base;
    budgets[idx_budgets++] = m[i].end - m[i].start;
    continue;
  }
  if (m[i].name.indexOf("DataCallback") != -1) {
    callbacks[idx_callbacks++] = m[i].end - m[i].start;
    continue;
  }
}

var callback_count = idx_callbacks;
console.log(time_base, cb_time, callbacks, budgets, callback_count);

/** Download contents as a file
 * Source: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
 */
function downloadBlob(content, filename, contentType) {
  // Create a blob
  var blob = new Blob([content], { type: contentType });
  var url = URL.createObjectURL(blob);

  // Create a link to download it
  var pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
}

var csv = "cb_time,callbacks,budgets,load\n";
for (var i = 0; i < callback_count; i++) {
  let load = callbacks[i] / budgets[i];
  csv += cb_time[i].toString() + "," + callbacks[i].toString() + "," + budgets[i].toString() + "," + load.toString() + "\n";
}

console.log("csv: ", csv);
downloadBlob(csv, 'export.csv', 'text/csv;charset=utf-8;')

return true;
