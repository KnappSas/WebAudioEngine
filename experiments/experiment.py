from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
import pyautogui
import time
from os.path import exists
import os
import shutil

def run_experiment(nTracks):
    options=Options()
    options.add_argument("-profile")
    options.add_argument("/Users/sknapp/Library/Application Support/Firefox/Profiles/29318iws.experiments")
    service = Service("/Users/sknapp/Documents/WebDriver/geckodriver")

    driver = webdriver.Firefox(service=service, options=options, firefox_binary="/Applications/Firefox.app/Contents/MacOS/firefox")
    driver.get("http://localhost:8888/")
    # driver.get("https://profiler.firefox.com/")

    btn = '{}-button'.format(nTracks)
    driver.find_element(By.ID, btn).click()

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
    
    try:
        driver.find_element(By.XPATH, "//button[text()[contains(., 'NativeAudioCallback')]]").click()
    except NoSuchElementException:
        driver.find_element(By.CSS_SELECTOR, "button.timelineSettingsHiddenTracks").click()
        driver.find_element(By.XPATH, "//div[text()='NativeAudioCallback']").click()
        driver.find_element(By.CSS_SELECTOR, ".Details-top-bar").click()
        driver.find_element(By.XPATH, "//button[text()[contains(., 'NativeAudioCallback')]]").click()

    f = open("export_markers.js", "r")
    driver.execute_script(f.read())
    time.sleep(1)

    downloadPath = "/Users/sknapp/Downloads/export.csv"
    while not exists(downloadPath):
        time.sleep(1)

    shutil.move(downloadPath, "{}/results/{}".format(os.getcwd(), nTracks))

    time.sleep(1)
    driver.quit()

run_experiment(1)
run_experiment(2)
run_experiment(10)
run_experiment(100)
run_experiment(250)