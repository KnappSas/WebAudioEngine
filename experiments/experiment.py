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
driver.get("https://jackschaedler.github.io/karplus-stress-tester/")

driver.find_element(By.ID, '250-button').click()
# driver.find_element(By.ID, 'choice-1').click()
driver.find_element(By.ID, 'start-button').click()
driver.find_element(By.ID, 'strum-button').click()

pyautogui.click(1680, 86)
time.sleep(10)
pyautogui.click(1680, 86)

original_window = driver.current_window_handle

wait = WebDriverWait(driver, 60)
wait.until(EC.number_of_windows_to_be(2))
for window_handle in driver.window_handles:
    if window_handle != original_window:
        driver.switch_to.window(window_handle)
        break

print("switched tabs...")
wait.until(EC.title_contains("Firefox 101"))

driver.find_element(By.CSS_SELECTOR, "button.timelineSettingsHiddenTracks").click()
driver.find_element(By.XPATH, "//div[text()='NativeAudioCallback']").click()
driver.find_element(By.CSS_SELECTOR, ".Details-top-bar").click()
driver.find_element(By.XPATH, "//button[text()[contains(., 'NativeAudioCallback')]]").click()

pyautogui.click(1732, 86)
