async function setupWorker(workerURL, tracks, sabs, nWorkers) {
    const nTracks = tracks.length;

    let tracksPerWorker = Math.floor(nTracks / nWorkers);
    let rest = nTracks - tracksPerWorker * nWorkers;

    let setupAudioReaderWorker = (iWorker, nTracksPerWorker) => {
        let p = new Promise((resolve) => {
            const worker = new Worker(workerURL);
            const iTrackStart = iWorker * nTracksPerWorker;
            const iTrackEnd = (iWorker + 1) * nTracksPerWorker;

            worker.postMessage({
                command: "init",
                sabs: sabs.slice(iTrackStart, iTrackEnd),
                tracks: tracks.slice(iTrackStart, iTrackEnd),
            });

            worker.onmessage = e => {
                switch (e.data.command) {
                    case "ready": {
                        resolve();
                        break;
                    }
                    default: {
                        throw Error("Unknown case in app.js");
                    }
                }
            }
        });
    }

    let promises = [];
    for (let iWorker = 0; iWorker < nWorkers - 1; iWorker++) {
        promises.push(setupAudioReaderWorker(iWorker, tracksPerWorker));
    }

    promises.push(setupAudioReaderWorker(nWorkers-1, tracksPerWorker+rest));

    await Promise.all(promises);
}