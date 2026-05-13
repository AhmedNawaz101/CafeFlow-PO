# BrewMaster POS

## Overview

**BrewMaster POS** is a comprehensive, offline Point-of-Sale (POS) application designed specifically for coffee shops and cafes. Built as a touch-optimized Android app, it streamlines daily operations with an intuitive menu grid, real-time cart management, professional receipt generation, and integrated reporting. The app includes a hidden admin panel for menu updates, pricing, analytics, and data exports, making it ideal for small businesses seeking efficient, cost-effective management without relying on internet connectivity.

This premium edition (v2.0.0) features a sleek dark-mode UI with glassmorphism effects, swipe gestures, and Bluetooth-enabled printing for receipts. It's fully offline-capable, using local storage to ensure reliability even in low-connectivity environments.

## Key Features

- **Touch-Optimized Interface**: Responsive menu grid and cart designed for 10" tablets.
- **Persistent Storage**: Offline data management using IndexedDB for menus, orders, and settings.
- **Receipt Printing**: ESC/POS formatted receipts with Web Bluetooth support (fallback to printable pages).
- **Admin Panel**: Hidden access (long-press logo for 5 seconds, PIN: 7860) for full CRUD operations on menu items, pricing, and reports.
- **Reporting & Analytics**: Daily/monthly reports with CSV export for data analysis.
- **Premium UI**: Dark mode with glassmorphism animations and interactive elements.
- **Order Management**: Auto-incrementing order numbers, swipe-to-delete cart items, and real-time totals.

## Technologies Used

- **Capacitor**: Cross-platform framework for native Android app deployment.
- **JavaScript (ES6+)**: Core logic for cart, database, printing, admin, and reports.
- **HTML5 & CSS3**: Frontend structure and styling.
- **IndexedDB**: Client-side database for offline persistence.
- **Android SDK & Gradle**: Build system for APK generation and WebView integration.
- **Web Bluetooth API**: For receipt printing (with compatibility fallbacks).
- **Other**: ESC/POS for receipt formatting, CSV for exports.

## Installation & Setup

### Prerequisites
- Android device (5.0+) or emulator.
- Enable "Unknown Sources" in Android settings for APK installation.
- For development: Node.js, npm, and Capacitor CLI.

### Quick Install (Pre-Built APK)
1. Download the APK from the `apk_work/` or `final_apk/` folder:
   - **Debug Version**: `MochaCoffee-debug.apk` (3.55 MB) - For testing.
   - **Release Version**: `MochaCoffee-release-unsigned.apk` (2.78 MB) - For production (sign before use).
2. Transfer the APK to your Android device.
3. Tap to install and open the app.

### Development Setup
1. Clone or copy the project files.
2. Install dependencies: `npm install @capacitor/cli @capacitor/core`.
3. Add Android platform: `npx cap add android`.
4. Copy web assets: `npx cap copy`.
5. Build and run: `npx cap run android` (or use the provided batch files like `finalize_apk.bat`).

### Signing for Production
- Use `sign_apk.bat` or manually sign the unsigned APK with your keystore.
- Upload to Google Play Store or distribute directly.

## Usage

- **Customer Mode**: Browse menu, add to cart, checkout, and print receipts.
- **Admin Mode**: Access via long-press on the logo (PIN: 7860) to manage menus, view reports, and export data.
- **Printing**: Ensure Bluetooth printer is paired for automatic receipts; otherwise, use the printable page fallback.

## File Structure

- `index.html` / `styles.css`: Main UI and styling.
- `js/`: Core modules (app.js, cart.js, database.js, printer.js, admin.js, reports.js).
- `android/`: Native Android build files.
- `apk_work/` / `final_apk/`: Built APK files and extracted assets.
- `www/`: Web assets for Capacitor.

## Version & Build Info

- **Version**: 2.0.0 - Premium Edition
- **Build Date**: February 13, 2026
- **Platform**: Android (Capacitor)
- **Size**: Debug ~3.55 MB, Release ~2.78 MB

## Notes

- For reliable Bluetooth printing, consider integrating a native Capacitor Bluetooth plugin.
- The app is fully offline; no internet required for core operations.
- Customize the logo, menu, and branding in `index.html` and `styles.css`.

## License

This project is proprietary and sold as-is for commercial use in coffee shops. Contact the developer for support or modifications.

---

*Built with ❤️ for coffee shop owners everywhere.*