from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pyautogui
import time

options=Options()
options.add_argument("-profile")
options.add_argument("/Users/sknapp/Library/Application Support/Firefox/Profiles/q1i6ce2p.experiments")
service = Service("/Users/sknapp/Documents/WebDriver/geckodriver")

driver = webdriver.Firefox(service=service, options=options, firefox_binary="/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox")
driver.get("http://localhost:8888/")

driver.find_element(By.ID, '1000-button').click()

WebDriverWait(driver, 300).until(EC.element_to_be_clickable((By.ID, 'startBtn')))
driver.find_element(By.ID, 'startBtn').click()
pyautogui.click(1713, 91)
time.sleep(10)
pyautogui.click(1713, 91)

original_window = driver.current_window_handle
WebDriverWait(driver, 60).until(EC.number_of_windows_to_be(2))
for window_handle in driver.window_handles:
    if window_handle != original_window:
        driver.switch_to.window(window_handle)
        break

print("switched tabs...")
WebDriverWait(driver, 60).until(EC.title_contains("Firefox 101"))

driver.find_element(By.CSS_SELECTOR, "button.timelineSettingsHiddenTracks").click()
driver.find_element(By.XPATH, "//div[text()='NativeAudioCallback']").click()
driver.find_element(By.CSS_SELECTOR, ".Details-top-bar").click()
driver.find_element(By.XPATH, "//button[text()[contains(., 'NativeAudioCallback')]]").click()

pyautogui.click(1679, 91)
