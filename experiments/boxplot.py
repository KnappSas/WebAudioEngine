# Import libraries
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import os 

# load comparison



#Memory (RSS),Memory (VSZ),CPU

# df = pd.read_csv('results-0/{}/{}/{}/AudioWorkletNode/cpu_mem.csv'.format(96, 0, "js"), usecols=['CPU'])
# df.rename(columns={'CPU':'AudioWorkletNode'}, inplace=True)

# df2= pd.read_csv('results-0/{}/{}/{}/AudioBufferSourceNode/cpu_mem.csv'.format(96, 0, "js"), usecols=['CPU'])
# df2.rename(columns={'CPU':'AudioBufferSourceNode'}, inplace=True)

# df['AudioBufferSourceNode'] = df2["AudioBufferSourceNode"]
# print(df.columns)

# fig = plt.figure(figsize =(10, 7))
# # Creating plot
# boxplot = df.boxplot()
# plt.show()


# df = pd.read_csv('results-0/{}/{}/{}/AudioWorkletNode/fps.csv'.format(96, 0, "js"), usecols=['fps'])
# df.rename(columns={'fps':'AudioWorkletNode'}, inplace=True)
# df2= pd.read_csv('results-0/{}/{}/{}/AudioBufferSourceNode/fps.csv'.format(96, 0, "js"), usecols=['fps'])
# df2.rename(columns={'fps':'AudioBufferSourceNode'}, inplace=True)

# df['AudioBufferSourceNode'] = df2["AudioBufferSourceNode"]
# fig = plt.figure(figsize =(10, 7))
# boxplot = df.boxplot()
# boxplot = sns.boxplot(data=df, width=0.5, palette="colorblind")
# boxplot.plot()
# plt.show()

def create_box_plot(path1, path2, column, name1, name2, ax, title):
    df = pd.read_csv(path1, usecols=[column])
    df.rename(columns={column:name1}, inplace=True)
    df2= pd.read_csv(path2, usecols=[column])
    df2.rename(columns={column:name2}, inplace=True)

    print(df2)
    df[name2] = df2[name2]
    print(df.columns)

    # fig = plt.figure(figsize =(10, 7))
    
    # return df.boxplot()
    ax.set_title(title)
    return sns.boxplot(data=df, width=0.15, ax=ax)


def create_plots_for_results2(result, load, option):
    path1 = 'results-{}/load-test/{}/{}/{}/export.csv'.format(result, load, option, "wasm")
    path2 = 'results-{}/load-test/{}/{}/{}/export.csv'.format(result, load, option, "js")
    name1 = "WebAssembly"
    name2 = "JavaScript"

    fig, axes = plt.subplots()
    ax = fig.add_subplot(111)
    boxplotLoad = create_box_plot(path1, path2, 'load', name1, name2, ax, "Audio Load")

    # path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/fps.csv'.format(result, 96, 0, "js")
    # path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/fps.csv'.format(result, 96, 0, "js")
    # boxplotFPS = create_box_plot(path1, path2, 'fps', name1, name2, axes[0,1], "FPS")

    # path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/cpu_mem.csv'.format(result, 96, 0, "js")
    # path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/cpu_mem.csv'.format(result, 96, 0, "js")
    # boxplotMem = create_box_plot(path1, path2, 'Memory (RSS)', name1, name2, axes[1,0], "Memory (RSS)")
    # boxplotCPU = create_box_plot(path1, path2, 'CPU', name1, name2, axes[1,1], "CPU")


def create_plots_for_result(result):
    path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/export.csv'.format(result, 96, 0, "js")
    path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/export.csv'.format(result, 96, 0, "js")
    name1 = "AudioWorkletNode"
    name2 = "AudioBufferSourceNode"

    fig, axes = plt.subplots(2,2)
    boxplotLoad = create_box_plot(path1, path2, 'load', name1, name2, axes[0,0], "Audio Load")

    path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/fps.csv'.format(result, 96, 0, "js")
    path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/fps.csv'.format(result, 96, 0, "js")
    boxplotFPS = create_box_plot(path1, path2, 'fps', name1, name2, axes[0,1], "FPS")

    path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/cpu_mem.csv'.format(result, 96, 0, "js")
    path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/cpu_mem.csv'.format(result, 96, 0, "js")
    boxplotMem = create_box_plot(path1, path2, 'Memory (RSS)', name1, name2, axes[1,0], "Memory (RSS)")
    boxplotCPU = create_box_plot(path1, path2, 'CPU', name1, name2, axes[1,1], "CPU")

# create_plots_for_result(0)
# create_plots_for_result(1)
# create_plots_for_result(2)
# create_plots_for_result(3)
# create_plots_for_result(4)
# create_plots_for_result(5)
# create_plots_for_result(6)
# create_plots_for_result(7)

create_plots_for_results2(21, 100, "sqrt-block")
plt.show()

# path1 = 'results-0/{}/{}/{}/AudioWorkletNode/fps.csv'.format(96, 0, "js")
# path2 = 'results-0/{}/{}/{}/AudioBufferSourceNode/fps.csv'.format(96, 0, "js")
# boxplotFPS = create_box_plot(path1, path2, 'fps', name1, name2)

# boxplotLoad.plot()
# boxplotFPS.plot()

#     df = pd.read_csv('{}/results/{}/{}/{}/export.csv'.format(os.getcwd(), i, load, lang), usecols=['cb_time', 'load'])
#     axs[subVIndex, subHIndex].hist(df['load'][np.isfinite(df['load'])], density=True, bins=32, label="load")  # density=False would make counts
#     axs[subVIndex, subHIndex].set_title("Load factor: {}, Language: {}".format(loads[subVIndex], languages[subHIndex]))
#     subHIndex += 1
# subVIndex += 1
# subHIndex = 0