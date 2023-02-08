# Experiment

## Preconditions
For the script to work, add the Profiler item to the Firefox toolbar (see screenshot below). 

<img src="./images/profiler_screenshot.png" alt= “” width="300" height="300">

After that you need to add the position of the Profiler item to the `experiments.py` script, where this is currently hard-coded. To find out the position of the Profiler item, you can open a terminal with python and run the following command, when your cursor is hovering over the Profiler item.

```python
import pyautogui
pyautogui.position()
```

This will output the cursor position in the following form.

```python
Point(x=992, y=410)
```

Add the x and y value to the pyautogui.click(...) commands in the experiment.py.

## Run experiments

To run the experiments, you need to run the following
```sh
python experiments.py
```

To generate the box plots of the measured results, run
```sh
python boxplot.py
```