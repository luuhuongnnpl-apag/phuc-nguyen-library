@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  py -3.11 -m venv .venv
  if errorlevel 1 goto fail
)
if not exist ".venv\pn-installed" (
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto fail
  echo OK> ".venv\pn-installed"
)
".venv\Scripts\python.exe" app.py
if errorlevel 1 goto fail
exit /b 0
:fail
echo Installation failed. Check Python 3.11 and internet connection.
pause
exit /b 1
