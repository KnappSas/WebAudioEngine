import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import scipy.stats as st
import os

  # load = df['load'].to_numpy()
# load.sort()

# median = load[math.floor(load.size / 2)]
# sum = 0
# for iLoad in load:
#     sum += iLoad

# mean = sum / load.size
# variance = 0
# for iLoad in load:
#     variance += math.pow(iLoad - mean, 2)

# variance /= load.size

# stddev = math.sqrt(variance)

# print(median, mean, variance, stddev)

def plot_results_and_save(loads):
    subVIndex = 0
    subHIndex = 0

    languages = ['js', 'wasm']
    fig, axs = plt.subplots(len(loads), len(languages),sharex=True,sharey=True)
    for i in [1]:
        for load in loads:
            for lang in languages:
                df = pd.read_csv('{}/results/{}/{}/{}/export.csv'.format(os.getcwd(), i, load, lang), usecols=['cb_time', 'load'])
                axs[subVIndex, subHIndex].hist(df['load'][np.isfinite(df['load'])], density=True, bins=32, label="load")  # density=False would make counts
                axs[subVIndex, subHIndex].set_title("Load factor: {}, Language: {}".format(loads[subVIndex], languages[subHIndex]))
                subHIndex += 1
            subVIndex += 1
            subHIndex = 0

    plt.suptitle("Load duration histogram")
    plt.tight_layout()
    plt.savefig('results/measurement.png')
    plt.show()

plot_results_and_save([10, 25])