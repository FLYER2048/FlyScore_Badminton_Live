@echo off
echo Start packaging FlyScore_Badminton_Live...

@REM REM Delete previous build/dist folders to ensure clean build
@REM if exist build rd /s /q build
@REM if exist dist rd /s /q dist
@REM if exist *.spec del *.spec

REM Run PyInstaller
REM --onefile: Package into a single executable
REM --add-data: Include templates and static folders
REM app.py: Entry script
pyinstaller --noconfirm --name "FlyScore_Badminton_Live_v0.4.0-rc.2_Windows_amd64_port5101" --onefile --add-data "templates;templates" --add-data "static;static" app.py

echo.
echo Packaging complete! The executable is located in the 'dist' folder.
pause
