@echo off
cd /d "C:\Users\ahmed\OneDrive\Desktop\q"
set JARSIGNER="C:\Users\ahmed\OneDrive\Desktop\q\openjdk11\jdk-11.0.20+8\bin\jarsigner.exe"
set KEYSTORE="C:\Users\ahmed\.android\debug.keystore"
set INPUT="apk_work\unsigned.apk"
set OUTPUT="MochaCoffee-final.apk"

echo Signing APK with debug keystore...
%JARSIGNER% -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore %KEYSTORE% -storepass android -keypass android -signedjar %OUTPUT% %INPUT% androiddebugkey

if %ERRORLEVEL% equ 0 (
  echo.
  echo APK signed successfully!
  dir %OUTPUT%
  echo.
  echo Final APK is ready at: %OUTPUT%
) else (
  echo.
  echo Signing failed with error code: %ERRORLEVEL%
)
