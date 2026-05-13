@echo off
cd /d "C:\Users\ahmed\OneDrive\Desktop\q"

cd /d "C:\Users\ahmed\OneDrive\Desktop\q\final_apk\extracted"

REM Use PowerShell to create the zip with Compress-Archive
powershell -NoProfile -Command "Compress-Archive -Path * -DestinationPath '..\app-temp.zip' -Force"

cd C:\Users\ahmed\OneDrive\Desktop\q
if exist "MochaCoffee-new-unsigned.apk" del "MochaCoffee-new-unsigned.apk"
ren "final_apk\app-temp.zip" "MochaCoffee-new-unsigned.apk"

echo Repackaged to MochaCoffee-new-unsigned.apk
dir MochaCoffee-new-unsigned.apk

echo.
echo Signing...
set JARSIGNER=C:\Users\ahmed\OneDrive\Desktop\q\openjdk11\jdk-11.0.20+8\bin\jarsigner.exe
set KEYSTORE=C:\Users\ahmed\.android\debug.keystore
set INPUT=MochaCoffee-new-unsigned.apk
set OUTPUT=MochaCoffee-NEW-SIGNED.apk

%JARSIGNER% -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore %KEYSTORE% -storepass android -keypass android -signedjar %OUTPUT% %INPUT% androiddebugkey

if %ERRORLEVEL% equ 0 (
  echo.
  echo Signing successful!
  dir %OUTPUT%
  echo.
  echo Installing to device...
  platform-tools\adb.exe install -r %OUTPUT%
  if %ERRORLEVEL% equ 0 (
    echo.
    echo SUCCESS! App installed!
    echo Your MochaCoffee app is now on the tablet with all updates
  ) else (
    echo Installation failed
  )
) else (
  echo Signing failed
)
