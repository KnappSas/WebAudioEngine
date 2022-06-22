from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
import pyautogui
import time
from os import path
import os
import shutil

def run_experiment(resultPath, nTracks, dspLang='js', load=0):
    options=Options()
    options.add_argument("-profile")
    options.add_argument("/Users/sknapp/Library/Application Support/Firefox/Profiles/29318iws.experiments")
    service = Service("/Users/sknapp/Documents/WebDriver/geckodriver")

    driver = webdriver.Firefox(service=service, options=options, firefox_binary="/Applications/Firefox.app/Contents/MacOS/firefox")
    driver.get("http://localhost:8888/")
    # driver.get("https://profiler.firefox.com/")

    language_option = 'choice-{}'.format(dspLang)
    driver.find_element(By.ID, language_option).click()
    track_btn = 'track-{}'.format(nTracks)
    driver.find_element(By.ID, track_btn).click()
    load_btn = 'load-{}'.format(load)
    driver.find_element(By.ID, load_btn).click()

    WebDriverWait(driver, 300).until(EC.element_to_be_clickable((By.ID, 'startBtn')))
    driver.find_element(By.ID, 'startBtn').click()
    pyautogui.click(1679, 91)
    time.sleep(10)
    pyautogui.click(1679, 91)

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
            # e.click()

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

    downloadPath = "/Users/sknapp/Downloads/export.csv"
    while not path.exists(downloadPath):
        time.sleep(1)

    finalPath = "{}/{}/{}/{}/export.csv".format(resultPath, nTracks, load, dspLang)
    shutil.move(downloadPath, finalPath)

    time.sleep(1)
    driver.quit()


numTracks = [1]
languages = ['js', 'wasm']
loads = [10, 25]

i = 0
while path.exists("{}/results-{}".format(os.getcwd(), i)): i += 1
resultPath = "{}/results-{}".format(os.getcwd(), i)
os.mkdir(resultPath)

for nTracks in numTracks:
    fpTracks = os.path.join(resultPath, "{}".format(nTracks))
    os.mkdir(fpTracks)
    for load in loads:
        fpLoad = os.path.join(fpTracks, "{}".format(load))
        os.mkdir(fpLoad)
        for language in languages:
            fpLang = os.path.join(fpLoad, "{}".format(language))
            os.mkdir(fpLang)
            run_experiment(resultPath, 1, language, load)
       
# run_experiment(2)
# run_experiment(10)
# run_experiment(100)
# run_experiment(250)