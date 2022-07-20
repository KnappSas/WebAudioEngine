class Mixer {
    constructor() {
        this.channels = [];
    }

    addChannel(track) {
        this.channels.push(track);
    }

    setGain(iChannel, gain) {
        if (iChannel < this.channels.length) {
            this.channels[iChannel].setGain(gain);
        }
    }
}