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
from matplotlib.ticker import PercentFormatter
from matplotlib.ticker import FormatStrFormatter

from statannot import add_stat_annotation
from outliers import remove_all_outliers

import re
REMOVE_OUTLIERS = False
ENABLE_TRACK_TEST = True
ENABLE_LOAD_TEST = True
mydpi=300

np.set_printoptions(threshold=sys.maxsize)

def compare_2_groups(arr_1, arr_2, alpha):
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

    if name1 == 'WebAssembly' or (name1 == 'AudioWorkletNode' and column == 'load'): 
        df.drop(df.tail(10).index,inplace=True) # drop last row because it often creates outliers
        df2.drop(df2.tail(10).index,inplace=True)
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
        if load == 0:
            loadTracks = [1, 12, 96]
        else:
            loadTracks = [1, 12]
        for nTracks in loadTracks:
            path1 = 'results-{}/load-test/{}/{}/{}/{}/export.csv'.format(
                result, load, option, "wasm", nTracks)
            path2 = 'results-{}/load-test/{}/{}/{}/{}/export.csv'.format(
                result, load, option, "js", nTracks)
            name1 = "WebAssembly"
            name2 = "JavaScript"

            df = create_data_frame(path1, path2, 'load', name1, name2)
            df['Option'] = option
            df['nTracks'] = nTracks
            dfList.append(df)

    cdf = pd.concat(dfList)
    return cdf

def create_plots_for_results2(result, load, option):
    basePath = 'results-{}/load-test/{}/{}/{}/export.csv'.format(result, load, option, '{}')

    wasmPath = basePath.format('wasm')
    jsPath = basePath.format('js')

    fig, axes = plt.subplots()
    ax = fig.add_subplot(111)

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

tracks = [1, 96]
groups = ['fps', 'load', 'Memory (RSS)', 'CPU']
df_track_dict = dict([
    (tracks[0], 
    dict([
        (groups[0], []),
        (groups[1], []),
        (groups[2], []),
        (groups[3], [])])),
    (tracks[1], 
    dict([
        (groups[0], []),
        (groups[1], []),
        (groups[2], []),
        (groups[3], [])]))  
    ])

loads = [0,15]
df_load_dict = dict([(loads[0], []), (loads[1], [])])

for iResult in range(1, 11):
    languages = ['wasm', 'js']
    load_options = ["none", "sqrt-samples", "sqrt-block"]

    if(ENABLE_LOAD_TEST):
        for load in loads:
            #fig, ax = plt.subplots()
            graphicsPath = 'results-{}/load-test/{}'.format(iResult, load)
            df = create_df_comp_option(iResult, load)
            df_load_dict[load].append(df)

    graphicsPath = ''
    file = 'export.csv' 

    if(ENABLE_TRACK_TEST):
        for nTracks in tracks:
            for group in [('fps', 'fps.csv'), ('load', 'export.csv'), ('Memory (RSS)', 'cpu_mem.csv'), ('CPU', 'cpu_mem.csv')]:
                graphicsPath = 'results-{}/track-test/{}'.format(iResult, nTracks)
                basePath = 'results-{}/track-test/{}/{}/{}'.format(iResult, nTracks, '{}', group[1])
                df = create_track_test_df(basePath, group[0])

                df_track_dict[nTracks][group[0]].append(df)
                
                sns.set_style("darkgrid")
                # create_comparison_hist(df,df,"AudioWorkletNode", "AudioBufferSourceNode", "Load")
                # plt.savefig('{}/{}_measurement_{}_hist.png'.format(graphicsPath, nTracks, group[0]))
                f, ax = plt.subplots(1,1)
                sns.boxplot(data=df, width=0.25, flierprops = dict(markerfacecolor = '0.50', markersize = 2))
                # sns.boxplot(data=df, width=0.25, showfliers = False)
                
                plt.savefig('{}/{}_measurement_{}_box.png'.format(graphicsPath, nTracks, group[0]), dpi=mydpi)

if ENABLE_LOAD_TEST:         
    for load in loads:
        if load == 0:
            loadTracks = [1, 12, 96]
        else:
            loadTracks = [1, 12]

        for nTracks in loadTracks:
            cdf = pd.concat(df_load_dict[load])

            mdf = pd.melt(cdf, id_vars=['Option', 'nTracks'])
            mdf.rename(columns={'variable': 'Language', 'value': 'load'}, inplace=True)
            mdf = mdf.loc[(mdf['nTracks'] == nTracks)]
            mdf = mdf[~mdf.isin([np.nan, np.inf, -np.inf]).any(1)] 

            if load == 15 and nTracks == 1:
                mdf = mdf.loc[(mdf['load'] <= 1.0)]
            if load == 0 and nTracks == 12:
                mdf = mdf.loc[(mdf['load'] <= 0.25)]  
            if load == 0 and nTracks == 96:
                mdf = mdf.loc[(mdf['load'] <= 2)]  

            # with pd.option_context('display.max_rows', None, 'display.max_columns', None):
            #     print(mdf)
            
            fig, ax = plt.subplots()

            ax.yaxis.set_major_formatter(FormatStrFormatter('%.2f'))

            # if load == 0:
            #     plt.legend([],[], frameon=False)
            # else:
            #     plt.legend(loc='center left', bbox_to_anchor=(1, 0))
            order = []
            box_pairs = []
            if load == 15 and nTracks == 12:
                order = ['none', 'sqrt-block']
                box_pairs = [(("none", "WebAssembly"), ("none", "JavaScript")), 
                            (('sqrt-block','WebAssembly'), ('sqrt-block', 'JavaScript'))]
            else:
                order = ['none', 'sqrt-block', 'sqrt-samples']
                box_pairs = [(("none", "WebAssembly"), ("none", "JavaScript")), 
                            (('sqrt-block','WebAssembly'), ('sqrt-block', 'JavaScript')), 
                            (('sqrt-samples', 'WebAssembly'), ('sqrt-samples', 'JavaScript'))]

            ax.yaxis.set_major_formatter(PercentFormatter(xmax=1.0, decimals=0))
            box_plot = sns.boxplot(data=mdf, y='load', x='Option', hue='Language',order = order, palette = 'magma', ax=ax, showfliers = True)
            #add_stat_annotation(box_plot, data=mdf, x='Option', y='load', hue='Language',
            #                    box_pairs=box_pairs,
            #                    test='t-test_ind', text_format='simple', loc='inside', verbose=1, order=order)

            box_plot.set(xlabel ="Scenario", ylabel = "Audio callback load (%)")
            # sns.move_legend(
            # ax, "right",
            # bbox_to_anchor=(.5, 1), ncol=3, title=None, frameon=False,
            # )
            plt.legend([],[], frameon=False)

            if load == 15:
                box_plot.set_ylim(0, 1.2)
            elif load == 0 and nTracks == 96:
                print("")
                # do nothing
            else:
                box_plot.set_ylim(0, 0.25)
            
            plt.savefig('comparison_{}_{}.png'.format(load, nTracks), dpi=mydpi)      

if ENABLE_TRACK_TEST:
    for nTracks in tracks:
        for group in [('fps', 'Frames per second (FPS)'), ('load', 'Audio callback load (%)'), ('Memory (RSS)', 'Memory (MB)'), ('CPU', 'CPU (%)')]:
            cdf = pd.concat(df_track_dict[nTracks][group[0]])
            cdf = cdf[~cdf.isin([np.nan, np.inf, -np.inf]).any(1)]

            f, ax = plt.subplots(1,1)
            ax.set_ylabel(group[1])
            if group[0] == 'load':
                ax.yaxis.set_major_formatter(PercentFormatter(xmax=1.0, decimals=0))
            # box_plot = sns.boxplot(data=cdf, width=0.25, flierprops = dict(markerfacecolor = '0.50', markersize = 2))
            box_plot = sns.boxplot(data=cdf, width=0.25,palette = 'colorblind')

            if group[0] == 'load':
                with pd.option_context('display.max_rows', None, 'display.max_columns', None):
                    print(cdf)
                compare_2_groups(cdf['AudioWorkletNode'], cdf['AudioBufferSourceNode'], 0.05)
            # vertical_offset = cdf['AudioWorkletNode'] * 0.05
            # vertical_offset = 0

            add_stat_annotation(box_plot, data=cdf,
                                box_pairs=[("AudioWorkletNode", "AudioBufferSourceNode")],
                                test='t-test_ind', text_format='simple', loc='inside', verbose=2)

            xtick = 0
            for node in ['AudioWorkletNode', 'AudioBufferSourceNode']:
                
                if group[0] == 'load':
                    median = round(cdf[node].median() * 100, 2)
                else:
                    median = round(cdf[node].median(), 2)
                s = group[1]
                unitStr = s[s.find("(")+1:s.find(")")]
                box_plot.text(xtick-0.42, cdf[node].median(), "Median:\n{} {}".format(median, unitStr), horizontalalignment='left',size='small',color='#3F3F3F',weight='semibold')
                xtick = xtick + 1
            # sns.boxplot(data=cdf, width=0.25, showfliers = False)
            plt.xticks([0,1], ['AudioWorkletStreamer', 'AudioBufferSourceStreamer'])
            plt.savefig('{}_track_{}_box.png'.format(nTracks, group[0]), dpi=mydpi)