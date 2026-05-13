// printer.js - prepares professional receipt and handles printing
// Integrates with receipt.js for stylized thermal printer and PDF output

import receipt from './receipt.js';
import nativePrint from './native-printer.js';

// Get logo as base64 for embedding in receipt
async function getLogoBase64() {
  try {
    const response = await fetch('logo.png');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load logo:', e);
    return '';
  }
}

async function sendToBluetooth(bytes) {
  // Attempt BLE write. Many printers are classic SPP and won't be found here.
  if (!navigator.bluetooth) throw new Error('Web Bluetooth not available');
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
  const g = await device.gatt.connect();
  // find first writable characteristic
  const services = await g.getPrimaryServices();
  for (const s of services) {
    const chars = await s.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write) {
        // write in chunks
        const MTU = 180; // safe chunk
        for (let i = 0; i < bytes.length; i += MTU) {
          const chunk = bytes.slice(i, i + MTU);
          await c.writeValue(chunk);
        }
        await g.disconnect();
        return true;
      }
    }
  }
  g.disconnect();
  throw new Error('No writable characteristic found');
}

// Try Android native printing
async function tryAndroidPrint(htmlContent) {
  try {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.printer) {
      const options = {
        name: 'Receipt',
        orientation: 'portrait',
        monochrome: true
      };
      return new Promise((resolve, reject) => {
        window.cordova.plugins.printer.print(htmlContent, options,
          () => resolve(true),
          (err) => reject(err)
        );
      });
    }
  } catch (e) {
    console.warn('Android print not available:', e);
  }
  return false;
}

export async function printReceipt(shopName, order, items) {
  if (!order.orderNumber) order.orderNumber = receipt.getNextOrderNumber();

  // Try SpeedX Native Printer connection first
  try {
    await nativePrint.printToNativePrinter(shopName, order, items);
    return; // Fast print complete
  } catch (e) {
    console.warn('Native BT serial print failed, falling back:', e.message);
  }

  const logoB64 = await getLogoBase64();
  const htmlReceipt = receipt.buildHTMLReceipt(shopName, order, items, logoB64);

  try {
    const printed = await tryAndroidPrint(htmlReceipt);
    if (printed) return;
  } catch (e) {
    console.warn('Cordova printer fallback failed:', e.message);
  }

  printHtmlContent(htmlReceipt);
}

export async function printHtmlContent(htmlReceipt) {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  document.body.appendChild(printFrame);

  printFrame.contentDocument.open();
  printFrame.contentDocument.write(htmlReceipt);
  printFrame.contentDocument.close();

  setTimeout(() => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => { document.body.removeChild(printFrame); }, 1000);
  }, 250);
}

export async function printReceiptPDF(shopName, order, items) {
  if (!order.orderNumber) order.orderNumber = receipt.getNextOrderNumber();
  const logoB64 = await getLogoBase64();
  const htmlReceipt = receipt.buildHTMLReceipt(shopName, order, items, logoB64);
  printHtmlContent(htmlReceipt);
}

export default { printReceipt, printReceiptPDF, getLogoBase64, printHtmlContent };
