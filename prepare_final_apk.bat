@echo off
cd /d "C:\Users\ahmed\OneDrive\Desktop\q"
if exist final_apk rmdir /s /q final_apk
mkdir final_apk\extracted
echo Extracting release APK...
powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('C:\Users\ahmed\OneDrive\Desktop\q\MochaCoffee-release-unsigned.apk', 'C:\Users\ahmed\OneDrive\Desktop\q\final_apk\extracted')"
echo.
echo Listing assets\public in extracted APK:
dir final_apk\extracted\assets\public
echo.
echo Now replacing assets\public with updated www...
if exist final_apk\extracted\assets\public rmdir /s /q final_apk\extracted\assets\public
xcopy www final_apk\extracted\assets\public /E /I /Y
echo.
echo New structure:
dir final_apk\extracted\assets\public
