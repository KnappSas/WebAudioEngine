from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

import pyautogui
import time
from os import path
import os
import shutil
import io
import subprocess
import numpy
import sys

downloadDir = "browser_download"

def read_tab_process():
    output = subprocess.run("ps x -o rss,pcpu,pid,vsz,command | grep \"/Applications/Firefox.app/Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container -childID 4 \"", shell=True, universal_newlines=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    buffer = io.StringIO(output.stdout)
    processStr = buffer.readline()
    processSplit = processStr.split()
    processMemory = int(processSplit[0])/1024
    processCPU = processSplit[1]
    processVsz = int(processSplit[3])/1024
    return (processMemory, processVsz, processCPU)

def run_track_test(resultPath, nTracks, streamingMode="AudioWorkletNode"):
    baseOutputPath = "{}/{}/{}".format(resultPath, nTracks, streamingMode)
    url = "http://localhost:8888/?nTracks={}&streamingMode={}".format(nTracks, streamingMode)
    run_experiment(baseOutputPath, url)

def run_load_test(resultPath, nTracks, load, dspLang, option):
    baseOutputPath = "{}/{}/{}/{}/{}".format(resultPath, load, option, dspLang, nTracks)
    url = "http://localhost:8888/?nTracks={}&lang={}&load={}&option={}&nPlugins=1&streamingMode={}".format(nTracks, dspLang, load, option, "AudioWorkletNode")
    run_experiment(baseOutputPath, url)

def run_experiment(outputPath, url):
    filelist = [ f for f in os.listdir(downloadDir) ]
    for f in filelist:
        os.remove(os.path.join(downloadDir, f))

    options=Options()
    options.add_argument("-profile")
    options.add_argument("/Users/sknapp/Library/Application Support/Firefox/Profiles/gq4kvs88.default")
    service = Service("/Users/sknapp/Documents/WebDriver/geckodriver")
    driver = webdriver.Firefox(service=service, options=options, firefox_binary="/Applications/Firefox.app/Contents/MacOS/firefox")
    driver.get(url)

    WebDriverWait(driver, 300).until(EC.element_to_be_clickable((By.ID, 'preloadBtn')))
    driver.find_element(By.ID, 'preloadBtn').click()
    
    WebDriverWait(driver, 300).until(EC.element_to_be_clickable((By.ID, 'startBtn')))
    driver.find_element(By.ID, 'startBtn').click()

    time.sleep(1)
    pyautogui.click(1644, 84)
    processUsage = [("Memory (RSS)", "Memory (VSZ)", "CPU")]

    for i in range(100):
        processUsage.append(read_tab_process())
        time.sleep(0.1)
    pyautogui.click(1644, 84) #1644, y=84
    
    mem_np_array = numpy.array(processUsage)
    memPath = os.path.join(outputPath, "{}".format("cpu_mem.csv"))
    numpy.savetxt(memPath, mem_np_array, delimiter=",",fmt='%s')
    driver.find_element(By.ID, 'exportFpsLog').click()

    fpsDownloadPath = os.path.join(downloadDir, "{}".format("fps.csv"))
    while not path.exists(fpsDownloadPath):
        time.sleep(1)

    fpFps = os.path.join(outputPath, "{}".format("fps.csv"))
    shutil.move(fpsDownloadPath, fpFps)

    original_window = driver.current_window_handle
    WebDriverWait(driver, 60).until(EC.number_of_windows_to_be(2))
    for window_handle in driver.window_handles:
        if window_handle != original_window:
            driver.switch_to.window(window_handle)
            break

    print("switched tabs...")
    WebDriverWait(driver, 60).until(EC.title_contains("Firefox 10"))

    elements = driver.find_elements(By.XPATH, "//div[text()='NativeAudioCallback']")
    for e in elements:
        if e.get_attribute('class') != "react-contextmenu-item checkable indented checked":
            driver.execute_script("arguments[0].click();", e)

    markers_exported = False
    for e in elements:
        driver.find_element(By.XPATH, "//button[text()[contains(., 'NativeAudioCallback')]]").click()
        f = open("export_markers.js", "r")
        markers_exported = driver.execute_script(f.read())
        if markers_exported:
            break

        driver.execute_script("arguments[0].click();", e)
        print("needed uncheck a thread")

    time.sleep(1)

    downloadPath = os.path.join(downloadDir, "{}".format("export.csv"))
    while not path.exists(downloadPath):
        time.sleep(1)

    fpLoadExport = os.path.join(outputPath, "{}".format("export.csv"))
    shutil.move(downloadPath, fpLoadExport)

    time.sleep(1)
    driver.quit()



languages = ['wasm', 'js']
load_options = ["none", "sqrt-samples", "sqrt-block"]
streamModes = ["AudioWorkletNode", "AudioBufferSourceNode"]

for round in range (0,20):
    i = 0
    while path.exists("{}/results-{}".format(os.getcwd(), i)): i += 1
    resultPath = "{}/results-{}".format(os.getcwd(), i)
    os.mkdir(resultPath)

    # load experiment - AudioWorkletNode vs AudioBufferSourceNode
    fpTrackTest = os.path.join(resultPath, "track-test")
    os.mkdir(fpTrackTest)

    for nTracks in [1, 96]:
        fpTracks = os.path.join(fpTrackTest, "{}".format(nTracks))
        os.mkdir(fpTracks)
        for mode in streamModes:
            fpMode = os.path.join(fpTracks, "{}".format(mode))
            os.mkdir(fpMode)
            run_track_test(fpTrackTest, nTracks, mode)

    # load experiment - JS vs. WebAssembly
    fpLoadTest = os.path.join(resultPath, "load-test")
    os.mkdir(fpLoadTest)
    
    loads = [0, 15]
    for load in loads:
        fpLoad = os.path.join(fpLoadTest, "{}".format(load))
        os.mkdir(fpLoad)
        for option in load_options:
            fpOption = os.path.join(fpLoad, "{}".format(option))
            os.mkdir(fpOption)
            for language in languages:
                fpLang = os.path.join(fpOption, "{}".format(language))
                os.mkdir(fpLang)

                numTracks = []
                if load == 0:
                    numTracks = [1, 12, 96]
                else:
                    numTracks = [1, 12]

                for nTracks in numTracks:
                    fpTracks = os.path.join(fpLang, "{}".format(nTracks))
                    os.mkdir(fpTracks)
                    run_load_test(fpLoadTest, nTracks, load, language, option)
