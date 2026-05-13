@echo off
cd /d "C:\Users\ahmed\OneDrive\Desktop\q"
echo Installing final APK to device...
platform-tools\adb.exe install -r "MochaCoffee-final.apk"
if %ERRORLEVEL% equ 0 (
  echo.
  echo Installation successful!
  echo.
  echo Your app is now installed on the tablet with all the changes:
  echo - Receipt redesigned with your logo (fancy restaurant style)
  echo - Automatic printing fixed
  echo - Summary/Report buttons working
  echo - Back button reliable
  echo - Performance optimized (lighter animations, reduced CSS effects)
  echo - Admin PIN: 0000
) else (
  echo Installation failed. Check connection and try again.
)
