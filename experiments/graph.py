import numpy as np
import math
import pandas as pd
import matplotlib.pyplot as plt
import scipy.stats as st
import statistics
import os

# df = pd.read_csv('{}/results/{}/export.csv'.format(os.getcwd(), 10), usecols=['cb_time', 'load'])
  
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

# plt.hist(df['load'], density=True, bins=82, label="load")  # density=False would make counts
# mn, mx = plt.xlim()
# print(mn, mx)
# plt.xlim(mn, mx)
# kde_xs = np.linspace(mn, mx, 300)
# kde = st.gaussian_kde(df['load'])
# plt.plot(kde_xs, kde.pdf(kde_xs), label="PDF")
# plt.legend(loc="upper left")
# plt.ylabel("Probability")
# plt.xlabel("Data")
# plt.title("Histogram")

for i in [10, 100, 250]:
    df = pd.read_csv('{}/results/{}/export.csv'.format(os.getcwd(), i), usecols=['cb_time', 'load'])
    plt.plot(df['cb_time'], df['load'], label= '{} Tracks'.format(i))

plt.title('Load on audio thread')
plt.ylabel('Load')
plt.xlabel('Time (ms)')
plt.legend()
x1,x2,y1,y2 = plt.axis()  
plt.axis((x1,x2,0,1))
plt.show()

# def plot_confidence_interval(x, values, z=1.96, color='#2187bb', horizontal_line_width=0.25):
#     mean = statistics.mean(values)
#     stdev = statistics.stdev(values)
#     confidence_interval = z * stdev / math.sqrt(len(values))

#     left = x - horizontal_line_width / 2
#     top = mean - confidence_interval
#     right = x + horizontal_line_width / 2
#     bottom = mean + confidence_interval
#     plt.plot([x, x], [top, bottom], color=color)
#     plt.plot([left, right], [top, top], color=color)
#     plt.plot([left, right], [bottom, bottom], color=color)
#     plt.plot(x, mean, 'o', color='#f44336')

#     return mean, confidence_interval


# plt.xticks([1, 2, 3, 4], ['FF', 'BF', 'FFD', 'BFD'])
# plt.title('Confidence Interval')
# plot_confidence_interval(1, df['load'])
# # plot_confidence_interval(2, [10, 21, 42, 45, 44])
# # plot_confidence_interval(3, [20, 2, 4, 45, 44])
# # plot_confidence_interval(4, [30, 31, 42, 45, 44])
# plt.show()