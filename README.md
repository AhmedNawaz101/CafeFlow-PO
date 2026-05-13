<<<<<<< HEAD
# Mocha Coffee POS (Offline Capacitor App)

This is an offline Point-of-Sale web app intended to run in a Capacitor Android WebView on a 10" tablet.

Features:
- Touch-optimized menu grid and cart
- Persistent storage using IndexedDB
- Receipt formatting (ESC/POS) and attempt to print via Web Bluetooth
- Manager/admin panel (long-press logo for 5s, PIN: 7860)
- Reports and CSV export

Files:
- `index.html` - UI shell
- `styles.css` - styles
- `js/database.js` - IndexedDB wrapper
- `js/cart.js` - cart and checkout logic
- `js/printer.js` - ESC/POS building and BLE attempt
- `js/admin.js` - admin panel
- `js/reports.js` - analytics
- `js/app.js` - app wiring

Notes:
- For reliable Bluetooth SPP printing on Android, integrate a Capacitor Bluetooth plugin (native) instead of Web Bluetooth. The module `js/printer.js` includes a BLE attempt and a fallback printable page.
- To package with Capacitor: run the usual `npm init` + `npm install @capacitor/cli @capacitor/core`, add Android, copy the web assets, and build the Android project.
=======
# CafeFlow-PO
BrewMaster POS is a premium offline Android app for coffee shops, featuring touch-optimized menus, real-time cart management, Bluetooth receipt printing, and a hidden admin panel for analytics and reports. Built with Capacitor, JavaScript, HTML5/CSS3, and IndexedDB for reliable offline operation.
>>>>>>> 532e7562b3ff4460d8897529899e6cb416397ecd
