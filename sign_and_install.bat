@echo off
cd /d "C:\Users\ahmed\OneDrive\Desktop\q"

echo Signing APK...
"C:\Users\ahmed\OneDrive\Desktop\q\openjdk11\jdk-11.0.20+8\bin\jarsigner.exe" -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "C:\Users\ahmed\.android\debug.keystore" -storepass android -keypass android -signedjar "MochaCoffee-READY.apk" "MochaCoffee-new-unsigned.apk" androiddebugkey

if %ERRORLEVEL% equ 0 (
  echo.
  echo Signing successful!
  dir MochaCoffee-READY.apk
  echo.
  echo Installing to device...
  platform-tools\adb.exe install -r "MochaCoffee-READY.apk"
  
  if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================
    echo SUCCESS! App installed on tablet!
    echo ====================================
    echo.
    echo All changes applied:
    echo  + Receipt redesigned with your logo
    echo  + Automatic printing fixed
    echo  + Summary/Report buttons working
    echo  + Back button reliable
    echo  + App optimized (faster/lighter)
    echo  + Your admin PIN: 0000
    echo.
  ) else (
    echo Installation failed
  )
) else (
  echo Signing failed
  exit /b 1
)
