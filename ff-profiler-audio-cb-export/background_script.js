var browser = browser || chrome;

function doit(e) {
  browser.tabs.executeScript({
    file: "/export_metrics.js"
  });
}

browser.browserAction.onClicked.addListener(doit);
