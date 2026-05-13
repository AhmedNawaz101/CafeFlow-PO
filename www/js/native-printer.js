// native-printer.js - helper for native Bluetooth SPP printing (Cordova/Capacitor)
import receipt from './receipt.js';

function concatBytes(...parts) {
  const total = parts.reduce((sum, p) => sum + (p ? p.length : 0), 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    if (!p) continue;
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function escInit() { return new Uint8Array([0x1B, 0x40]); } // ESC @
function escAlign(n) { return new Uint8Array([0x1B, 0x61, n]); } // ESC a n
function escFeed(n) { return new Uint8Array([0x1B, 0x64, n]); } // ESC d n
function escCutPartial() { return new Uint8Array([0x1D, 0x56, 0x42, 0x00]); } // GS V B 0

async function loadLogoImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Logo fetch failed');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function toRasterBytesFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height).data;

  // 4x4 Bayer ordered dithering matrix (0..15)
  const bayer = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  const widthBytes = Math.ceil(width / 8);
  const data = new Uint8Array(widthBytes * height);
  let i = 0;

  for (let y = 0; y < height; y++) {
    for (let bx = 0; bx < widthBytes; bx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit;
        if (x >= width) continue;
        const idx = (y * width + x) * 4;
        const r = img[idx];
        const g = img[idx + 1];
        const b = img[idx + 2];
        const a = img[idx + 3];

        // White background for transparency
        const rr = a === 0 ? 255 : r;
        const gg = a === 0 ? 255 : g;
        const bb = a === 0 ? 255 : b;

        // Luminance (perceptual)
        const lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
        const t = (bayer[y & 3][x & 3] + 0.5) / 16; // 0..1
        const black = (lum / 255) < t;
        if (black) byte |= (0x80 >> bit);
      }
      data[i++] = byte;
    }
  }

  // GS v 0 m xL xH yL yH d1..dk
  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;
  const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  return concatBytes(header, data);
}

async function buildLogoRaster(maxWidthDots = 576) {
  try {
    const img = await loadLogoImage('logo.png');
    const targetW = Math.min(maxWidthDots, 384, img.naturalWidth || img.width || 384);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = targetW / iw;
    const targetH = Math.max(1, Math.round(ih * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return toRasterBytesFromCanvas(canvas);
  } catch (_) {
    return null;
  }
}

function promisify(fn, ...args) {
  return new Promise((resolve, reject) => {
    try { fn(...args, resolve, reject); }
    catch (err) { reject(err); }
  });
}

async function listDevices() {
  if (!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.list.bind(window.bluetoothSerial));
}

async function connect(address) {
  if (!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.connect.bind(window.bluetoothSerial), address);
}

async function disconnect() {
  if (!window.bluetoothSerial) return;
  return new Promise((resolve) => { try { window.bluetoothSerial.disconnect(resolve, resolve); } catch (e) { resolve(); } });
}

async function write(data) {
  if (!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.write.bind(window.bluetoothSerial), data);
}

export async function printToNativePrinter(shopName, order, items) {
  const textBytes = receipt.buildESCPOSReceipt(shopName, order, items);
  const logoBytes = await buildLogoRaster(576);

  const bytes = concatBytes(
    escInit(),
    escAlign(1),
    logoBytes,
    logoBytes ? escFeed(1) : null,
    escAlign(0),
    textBytes,
    escFeed(3),
    escCutPartial()
  );

  const devices = await listDevices();
  if (!devices || devices.length === 0) throw new Error('No paired Bluetooth devices found. Pair the printer in Android Settings.');

  // Try to find a thermal POS printer heuristically
  let device = devices.find(d => /printer|pos|pt-|mtp|speedx/i.test(d.name || '')) || devices[0];
  const address = device.address || device.id || device.uuid || device.name;
  if (!address) throw new Error('Unable to determine printer address');

  await connect(address);
  // Some plugins accept ArrayBuffer directly
  try {
    await write(bytes.buffer);
  } catch (e) {
    // try string fallback
    const txtStr = new TextDecoder().decode(bytes);
    await write(txtStr);
  }
  await disconnect();
}

export default { printToNativePrinter };
