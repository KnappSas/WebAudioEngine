# Import libraries
from imp import load_dynamic
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import os
from pylab import rcParams
from scipy.stats import f_oneway
from scipy.stats import ttest_ind
import sys
from matplotlib.ticker import ScalarFormatter
REMOVE_OUTLIERS = True

# https://medium.com/analytics-vidhya/removing-outliers-from-data-using-python-and-pandas-a3b5c6cded2c
def get_iqr_values(df_in, col_name):
    median = df_in[col_name].median()
    q1 = df_in[col_name].quantile(0.25) # 25th percentile / 1st quartile
    q3 = df_in[col_name].quantile(0.75) # 7th percentile / 3rd quartile
    iqr = q3-q1 #Interquartile range
    minimum  = q1-1.5*iqr # The minimum value or the |- marker in the box plot
    maximum = q3+1.5*iqr # The maximum value or the -| marker in the box plot
    return median, q1, q3, iqr, minimum, maximum

def get_iqr_text(df_in, col_name):
    median, q1, q3, iqr, minimum, maximum = get_iqr_values(df_in, col_name)
    text = f"median={median:.2f}, q1={q1:.2f}, q3={q3:.2f}, iqr={iqr:.2f}, minimum={minimum:.2f}, maximum={maximum:.2f}"
    return text

def remove_outliers(df_in, col_name):
    _, _, _, _, minimum, maximum = get_iqr_values(df_in, col_name)
    df_out = df_in.loc[(df_in[col_name] > minimum) & (df_in[col_name] < maximum)]
    return df_out

def count_outliers(df_in, col_name):
    _, _, _, _, minimum, maximum = get_iqr_values(df_in, col_name)
    df_outliers = df_in.loc[(df_in[col_name] <= minimum) | (df_in[col_name] >= maximum)]
    return df_outliers.shape[0]

def remove_all_outliers(df_in, col_name):
    loop_count = 0
    outlier_count = count_outliers(df_in, col_name)

    while outlier_count > 0:
        loop_count += 1

        if (loop_count > 100):
            break

        df_in = remove_outliers(df_in, col_name)
        outlier_count = count_outliers(df_in, col_name)
    
    return df_in

def compare_2_groups(arr_1, arr_2, alpha, sample_size):
    stat, p = ttest_ind(arr_1, arr_2)
    print('Statistics=%.3f, p=%.3f' % (stat, p))
    if p > alpha:
        print('Same distributions (fail to reject H0)')
    else:
        print('Different distributions (reject H0)')

# np.set_printoptions(threshold=sys.maxsize)
def plot_distribution_comp(inp1, inp2):
    plt.figure()
    ax1 = sns.distplot(inp1['WebAssembly'])
    ax1.set_title("ztre")
    plt.axvline(np.mean(inp1['WebAssembly']), color="b", linestyle="dashed", linewidth=1)

    if REMOVE_OUTLIERS:
        abcd = remove_all_outliers(inp2, 'JavaScript')
        abcd=inp2[inp2['JavaScript'] <= 0.2]['JavaScript']
    else:
        abcd = inp2

    ax2 = sns.distplot(abcd['JavaScript'])
    ax2.set_title("abcd")
    plt.axvline(np.mean(abcd['JavaScript']), color="orange", linestyle="dashed", linewidth=1)

    compare_2_groups(inp1['WebAssembly'], inp2['JavaScript'], 0.95, len(inp1.index))

    return plt.figure

def plot_distribution(inp):
    plt.figure()
    ax = sns.distplot(inp)
    print(inp)
    plt.axvline(np.mean(inp['WebAssembly']), color="k", linestyle="dashed", linewidth=1)
    # _, max_ = plt.ylim()
    # plt.text(
    #     inp.mean() + inp.mean() / 10,
    #     max_ - max_ / 10,
    #     "Mean: {:.2f}".format(inp.mean()),
    # )
    return plt.figure

def create_data_frame(path1, path2, column, name1, name2):
    df = pd.read_csv(path1, usecols=[column])
    df.rename(columns={column: name1}, inplace=True)
    df2 = pd.read_csv(path2, usecols=[column])
    df2.rename(columns={column: name2}, inplace=True)
    df[name2] = df2[name2]
    return df


def create_box_plot(path1, path2, column, name1, name2, ax, title):
    df = create_data_frame(path1, path2, column, name1, name2)

    # ax.set_title(title)
    # ax.grid(True)
    # return sns.boxplot(data=df, width=0.25, ax=ax)

def create_df_comp_option(result, load):
    dfList = []
    for option in ['none', 'sqrt-samples', 'sqrt-block']:
        path1 = 'results-{}/load-test/{}/{}/{}/export.csv'.format(
            result, load, option, "wasm")
        path2 = 'results-{}/load-test/{}/{}/{}/export.csv'.format(
            result, load, option, "js")
        name1 = "WebAssembly"
        name2 = "JavaScript"

        df = create_data_frame(path1, path2, 'load', name1, name2)
        # if REMOVE_OUTLIERS:
        #     df = remove_all_outliers(df, 'WebAssembly')
        #     df = remove_all_outliers(df, 'JavaScript')
        df['Option'] = option
        dfList.append(df)

    cdf = pd.concat(dfList)
    return cdf
    # fig, ax = plt.subplots()
    # ax.set_yscale('log')
    # for axis in [ax.xaxis, ax.yaxis]:
    # axis.set_major_formatter(ScalarFormatter())
    # ax.grid(True)

    #return sns.boxplot(data=mdf, x='Option', y='load', hue='Language',order = ['none', 'sqrt-block', 'sqrt-samples'], palette = 'magma', ax=ax)

def create_plots_for_results2(result, load, option):
    basePath = 'results-{}/load-test/{}/{}/{}/export.csv'.format(result, load, option, '{}')

    wasmPath = basePath.format('wasm')
    jsPath = basePath.format('js')

    fig, axes = plt.subplots()
    ax = fig.add_subplot(111)
    # boxplotLoad = create_box_plot(wasmPath, jsPath, 'load', "WebAssembly", "JavaScript", ax, "Audio Load")

    # path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/fps.csv'.format(result, 96, 0, "js")
    # path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/fps.csv'.format(result, 96, 0, "js")
    # boxplotFPS = create_box_plot(path1, path2, 'fps', name1, name2, axes[0,1], "FPS")

    # path1 = 'results-{}/{}/{}/{}/AudioWorkletNode/cpu_mem.csv'.format(result, 96, 0, "js")
    # path2 = 'results-{}/{}/{}/{}/AudioBufferSourceNode/cpu_mem.csv'.format(result, 96, 0, "js")
    # boxplotMem = create_box_plot(path1, path2, 'Memory (RSS)', name1, name2, axes[1,0], "Memory (RSS)")
    # boxplotCPU = create_box_plot(path1, path2, 'CPU', name1, name2, axes[1,1], "CPU")

def create_plots_for_result(result):
    basePath = 'results-{}/{}/{}/{}/{}'
    name1 = "AudioWorkletNode"
    name2 = "AudioBufferSourceNode"

    path1 = basePath.format(result, 'track-test', 96, name1, "export.csv")
    path2 = 'results-{}/track-test/{}/AudioBufferSourceNode/export.csv'.format(
        result, 96)

    axes = []
    #fig, axes = plt.subplots(2, 2)
    boxplotLoad = create_box_plot(
        path1, path2, 'load', name1, name2, axes[0, 0], "Audio Load")

    path1 = 'results-{}/track-test/{}/AudioWorkletNode/fps.csv'.format(
        result, 96, 0, "js")
    path2 = 'results-{}/track-test/{}/AudioBufferSourceNode/fps.csv'.format(
        result, 96, 0, "js")
    boxplotFPS = create_box_plot(
        path1, path2, 'fps', name1, name2, axes[0, 1], "FPS")

    path1 = 'results-{}/track-test/{}/AudioWorkletNode/cpu_mem.csv'.format(
        result, 96, 0, "js")
    path2 = 'results-{}/track-test/{}/AudioBufferSourceNode/cpu_mem.csv'.format(
        result, 96, 0, "js")
    boxplotMem = create_box_plot(
        path1, path2, 'Memory (RSS)', name1, name2, axes[1, 0], "Memory (RSS)")
    boxplotCPU = create_box_plot(
        path1, path2, 'CPU', name1, name2, axes[1, 1], "CPU")


def create_track_test_df(basePath, col):
    workletPath = basePath.format("AudioWorkletNode")
    bufferSourcePath = basePath.format("AudioBufferSourceNode")

    return create_data_frame(workletPath, bufferSourcePath, col, "AudioWorkletNode", "AudioBufferSourceNode")

def compare_wasm_js_significance(df):
    compare_2_groups(df['WebAssembly'], df['JavaScript'], 0.05, len(df.index))

def create_load_test_df(basePath):
    wasmPath = basePath.format('wasm')
    jsPath = basePath.format('js')

    return create_data_frame(wasmPath, jsPath, 'load', 'WebAssembly', 'JavaScript')

# def create_hist(df, col, color="b"):
#     df = remove_all_outliers(df, col)
#     ax = sns.distplot(df[col])
#     plt.axvline(np.mean(df[col]), color=color, linestyle="dashed", linewidth=1)

def create_comparison_hist(df1, df2, col1, col2, ax, xLabel=""):
    f, ax = plt.subplots(1,1)

    sns.distplot(df1[col1], label=col1, ax=ax)
    sns.distplot(df2[col2], label=col2, ax=ax)
    
    plt.axvline(np.mean(df1[col1]), color="b", linestyle="dashed", linewidth=1)
    plt.axvline(np.mean(df2[col2]), color="orange", linestyle="dashed", linewidth=1)
    
    ax.legend()
    ax.set(xlabel=xLabel, ylabel='Density')

    # create_hist(df1, col1, "b")
    # create_hist(df2, col2, "orange")

def create_load_histogram_comp(df, ax, xLabel=""):
    create_comparison_hist(df, df, 'WebAssembly', 'JavaScript', ax, xLabel)

loads = [0,50]
df_load_dict = dict([(loads[0], []), (loads[1], [])])

for iResult in range(0, 1):
    languages = ['wasm', 'js']
    load_options = ["none", "sqrt-samples", "sqrt-block"]

    # for lang in languages:
    #     for load in loads:
    #         for option in load_options:
    #             plt.figure()
    #             graphicsPath = 'results-{}/load-test/{}/{}'.format(iResult, load, option)
    #             basePath = 'results-{}/load-test/{}/{}/{}/{}'
    #             basePath = basePath.format(iResult, load, option, '{}', 'export.csv')
    #             df = create_load_test_df(basePath)
    #             if REMOVE_OUTLIERS:
    #                 df = remove_all_outliers(df, 'WebAssembly')
    #                 df = remove_all_outliers(df, 'JavaScript')
    #             sns.boxplot(data=df, width=0.25)
    #             plt.savefig('{}/{}_{}_measurement_bar.png'.format(graphicsPath, load, option))

    for load in loads:
        #fig, ax = plt.subplots()
        graphicsPath = 'results-{}/load-test/{}'.format(iResult, load)
        df = create_df_comp_option(iResult, load)
        df_load_dict[load].append(df)

        # else:
        #     plt.legend(loc='center left', bbox_to_anchor=(1, 0))
        # plt.setp(ax.get_xticklabels(), rotation=30, horizontalalignment='right')
        # plt.tight_layout()
        # plt.savefig('{}/comparison2.png'.format(graphicsPath))  

for load in loads:
    cdf = pd.concat(df_load_dict[load])

    if REMOVE_OUTLIERS:
        df_list = []
        for option in ['none', 'sqrt-samples', 'sqrt-block']:
            df_in = cdf.loc[(cdf["Option"] == option)]
            df_out_wasm = remove_all_outliers(df_in, 'WebAssembly').drop(["JavaScript", "Option"], axis=1)
            df_out_js = remove_all_outliers(df_in, 'JavaScript').drop(["WebAssembly", "Option"], axis=1)

            df_out_wasm['JavaScript'] = df_out_js['JavaScript']
            df_out_wasm['Option'] = option

            df_list.append(df_out_wasm)
        cdf = pd.concat(df_list)

    mdf = pd.melt(cdf, id_vars=['Option'])
    mdf.rename(columns={'variable': 'Language', 'value': 'load'}, inplace=True)
    
    fig, ax = plt.subplots()
    # plt.setp(ax.get_xticklabels(), rotation=30, horizontalalignment='right')

    #iAx = iAx + 1     
    # plt.tight_layout()
    # ax.set_yscale('log')

    # if load == 0:
    #     plt.legend([],[], frameon=False)
    # else:
    #     plt.legend(loc='center left', bbox_to_anchor=(1, 0))
    ax = sns.boxplot(data=mdf, x='Option', y='load', hue='Language',order = ['none', 'sqrt-block', 'sqrt-samples'], palette = 'magma', ax=ax)

    sns.move_legend(
    ax, "lower center",
    bbox_to_anchor=(.5, 1), ncol=3, title=None, frameon=False,
    )

    plt.savefig('comparison_{}.png'.format(load))      

    # graphicsPath = ''
    # file = 'export.csv' 

    # f, ax = plt.subplots(1,1)
    # for nTracks in [1, 96]:
    #     for group in [('fps', 'fps.csv'), ('load', 'export.csv'), ('Memory (RSS)', 'cpu_mem.csv'), ('CPU', 'cpu_mem.csv')]:
    #         graphicsPath = 'results-{}/track-test/{}'.format(iResult, nTracks)
    #         basePath = 'results-{}/track-test/{}/{}/{}'.format(iResult, nTracks, '{}', group[1])
    #         df = create_track_test_df(basePath, group[0])
    #         if REMOVE_OUTLIERS:
    #             df = remove_all_outliers(df, "AudioWorkletNode")
    #             df = remove_all_outliers(df, "AudioBufferSourceNode")

    #         sns.set_style("darkgrid")
            
    #         create_comparison_hist(df,df,"AudioWorkletNode", "AudioBufferSourceNode", "Load")
    #         plt.savefig('{}/{}_measurement_{}_hist.png'.format(graphicsPath, nTracks, group[0]))

    #         sns.boxplot(data=df, width=0.25)
    #         plt.savefig('{}/{}_measurement_{}_box.png'.format(graphicsPath, nTracks, group[0]))
            
            #compare_2_groups(df['AudioWorkletNode'], df['AudioBufferSourceNode'], 0.95, len(df.index))

# f, ax = plt.subplots(1,2)
# # ax[0].set_title('Load')
# # ax.grid(True)
# df = remove_all_outliers(df, 'WebAssembly')
# df = remove_all_outliers(df, 'JavaScript')
# sns.boxplot(data=df, width=0.25, ax=ax[0])
# create_load_histogram_comp(df, ax[1], 'Load')

# compare_wasm_js_significance(df)
# ------------------------------------------------------
# df = create_track_test_df(2, 96, 'cpu_mem.csv', 'Memory (RSS)')
# create_comparison_hist(df,df,"AudioWorkletNode", "AudioBufferSourceNode", "Memory")
# compare_2_groups(df['AudioWorkletNode'], df['AudioBufferSourceNode'], 0.05, len(df.index))
# basePath = 'results-{}/track-test/{}/{}/{}'.format(result, nTracks, '{}', file)
# df = create_track_test_df(basePath, 'load')
# df = remove_all_outliers(df, "AudioWorkletNode")
# df = remove_all_outliers(df, "AudioBufferSourceNode")

# create_comparison_hist(df,df,"AudioWorkletNode", "AudioBufferSourceNode", "Load")
# plt.savefig('measurement1.png')
# plt.figure()
# sns.boxplot(data=df, width=0.25)
# compare_2_groups(df['AudioWorkletNode'], df['AudioBufferSourceNode'], 0.95, len(df.index))
# plt.savefig('measurement2.png')
# plt.show()