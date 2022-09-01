const getProcessor = (moduleId) => {
    const audioWorkletGlobalScope = globalThis;
    const { registerProcessor } = audioWorkletGlobalScope;

    const ModuleScope =
        audioWorkletGlobalScope.webAudioModules.getModuleScope(moduleId);
    const { WamProcessor, WamParameterInfo } = ModuleScope;

    const States = {
        running: 0,
        idle: 1,
    };

    class Processor extends WamProcessor {
        constructor(options) {
            super(options);
            this.threshold = 0.05;
            this.state = States.running;

            const cyclesPerSample = 440.0 / sampleRate;
            this.angleDelta = cyclesPerSample * 2.0 * Math.PI;
            this.currentAngle = 0.5*Math.PI;

            this.samplesElapsed = 0;

            this.q = [];
        }

        processInput(channels) {
            if (channels.length < 1) return;

            let highestSampleInBlock = 0.0;
            let iThresholdPassed = -1;
            let collectSamples = false;
            for (let iChannel = 0; iChannel < channels.length; iChannel++) {
                for (let iSample = 0; iSample < channels[iChannel].length; iSample++) {
                    const sample = Math.abs(channels[iChannel][iSample]);

                    if(highestSampleInBlock < sample) {
                        highestSampleInBlock = sample;
                    }

                    if (sample > this.threshold) {
                        // collectSamples = true;
                        iThresholdPassed = iSample;
                        iChannel = iSample = 1000;
                        break;
                    }

                    // if(collectSamples) {
                    //     this.q.push(sample);
                    // }
                }
            }

            console.log("highest sample: ", highestSampleInBlock);

            if (iThresholdPassed > -1) {
                this.samplesElapsed += iThresholdPassed;
                // if(this.q.length >= 256) {
                //     console.log(this.q);
                //     this.state = States.idle;
                // }
                this.state = States.idle;
                console.log("samples elapsed: ", this.samplesElapsed);
                console.log("current time: ", currentTime);
            } else {
                const numberOfSamples = channels[0].length;
                this.samplesElapsed += numberOfSamples;
            }
        }

        generateSignal(channels) {
            if (channels.length < 1) return;
            const numberOfSamples = channels[0].length;

            for (let iSample = 0; iSample < numberOfSamples; iSample++) {
                const currentSample = Math.sin(this.currentAngle);
                for (let iChannel = 0; iChannel < channels.length; iChannel++) {
                    channels[iChannel][iSample] = currentSample;
                }
                
                this.currentAngle += this.angleDelta;
            }
        }

        _process(startSample, endSample, inputs, outputs) {
            if (this.state === States.idle) return;

            let output = outputs[0];
            let input = inputs[0];

            this.processInput(input);
            this.generateSignal(output);
        }
    }

    try {
        registerProcessor("WebAudioModuleLatencyMeasurer", Processor);
    } catch (error) {
        console.warn(error);
    }

    return Processor;
};

export default getProcessor;
