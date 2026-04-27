@echo off 
title PneumoDetect AI System 
color 0A 
echo ======================================== 
echo    PneumoDetect AI System Launcher 
echo ======================================== 
echo. 
echo [1/2] Starting Backend Server... 
start "PneumoDetect Backend" cmd /k "cd /d C:\Users\PC\Desktop\PNEUMONIA DETECTION\backend && ..\.venv\Scripts\activate && python app.py" 
timeout /t 3 /nobreak > nul 
echo [2/2] Starting Frontend Server... 
start "PneumoDetect Frontend" cmd /k "cd /d C:\Users\PC\Desktop\PNEUMONIA DETECTION\frontend && py -m http.server 8000" 
timeout /t 2 /nobreak > nul 
echo Opening browser... 
start http://localhost:8000/ 
echo. 
echo ======================================== 
echo    System Started Successfully! 
echo    Backend: http://localhost:5000 
echo    Frontend: http://localhost:8000 
echo ======================================== 
echo. 
pause > nul 
