class JSLoadProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    static get parameterDescriptors () {
        return [{
          name: 'load',
          defaultValue: 1,
          minValue: 0.001,
          maxValue: 1000,
          automationRate: 'k-rate'
        }]
      }

    process(inputs, outputs, parameters) {
        let output = outputs[0];
        let input = inputs[0];
        let load = parameters.load;
        
        let iterations = Math.floor(load[0] * 1000);   
        let gain_compensation = 1 / iterations;
        
        for (let iChannel = 0; iChannel < output.length; iChannel++) {
            for (var j = 0; j < iterations; j++) {
                for (var iSample = 0; iSample < output[iChannel].length; iSample++) {
                    output[iChannel][iSample] += input[iChannel % input.length][iSample] * gain_compensation;
                }
            }
        }

        return true;
    }
}

registerProcessor('load-processor-js', JSLoadProcessor);