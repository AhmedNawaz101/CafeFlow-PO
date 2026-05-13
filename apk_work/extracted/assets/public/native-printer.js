// native-printer.js - helper for native Bluetooth SPP printing (Cordova/Capacitor)
// This file expects a native Bluetooth Serial plugin to be available (cordova-plugin-bluetooth-serial)
// Install in your Capacitor Android project with:
//   npm install cordova-plugin-bluetooth-serial
//   npx cap sync android
// Then the plugin is available at runtime as `window.bluetoothSerial`.

function toArrayBuffer(uint8arr){ return uint8arr.buffer; }

function buildESCReceiptText(shopName, order, items){
  const date = new Date(order.datetime).toLocaleString();
  const lines = [];
  lines.push(shopName);
  lines.push(date);
  lines.push('-----------------------------');
  for(const it of items){
    const name = it.name.length>18? it.name.slice(0,18): it.name;
    const left = `${name} x${it.quantity}`;
    const right = `${it.subtotal.toFixed(2)}`;
    const spaceCount = Math.max(1, 31 - left.length - right.length);
    lines.push(left + ' '.repeat(spaceCount) + right);
  }
  lines.push('-----------------------------');
  lines.push('TOTAL: ' + order.total_amount.toFixed(2));
  lines.push('');
  lines.push('Thank you for visiting');
  lines.push('\n\n');
  return lines.join('\n');
}

function promisify(fn, ...args){
  return new Promise((resolve,reject)=>{
    try{ fn(...args, resolve, reject); }
    catch(err){ reject(err); }
  });
}

async function listDevices(){
  if(!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.list.bind(window.bluetoothSerial));
}

async function connect(address){
  if(!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.connect.bind(window.bluetoothSerial), address);
}

async function disconnect(){
  if(!window.bluetoothSerial) return;
  return new Promise((resolve)=>{ try{ window.bluetoothSerial.disconnect(resolve, resolve); }catch(e){ resolve(); } });
}

async function write(data){
  if(!window.bluetoothSerial) throw new Error('cordova-plugin-bluetooth-serial not available');
  return await promisify(window.bluetoothSerial.write.bind(window.bluetoothSerial), data);
}

export async function printToNativePrinter(shopName, order, items){
  const txt = buildESCReceiptText(shopName, order, items);
  // ESC/POS init + text + cut commands
  const encoder = new TextEncoder();
  const init = encoder.encode('\x1B\x40');
  const cut = encoder.encode('\x1D\x56\x41\x10');
  const body = encoder.encode(txt);
  // concat
  const bytes = new Uint8Array(init.length + body.length + cut.length);
  bytes.set(init, 0); bytes.set(body, init.length); bytes.set(cut, init.length + body.length);

  // If plugin available, get paired devices and ask user to choose (simple flow)
  const devices = await listDevices();
  if(!devices || devices.length===0) throw new Error('No paired Bluetooth devices found. Pair the printer in Android Settings.');
  let device = devices[0];
  if(devices.length>1){
    // choose first for now; native UI could let user pick
    device = devices[0];
  }
  const address = device.address || device.id || device.uuid || device.name;
  if(!address) throw new Error('Unable to determine printer address');

  await connect(address);
  // Some plugins accept ArrayBuffer directly
  try{ await write(bytes.buffer); }
  catch(e){
    // try string fallback
    const txtStr = new TextDecoder().decode(bytes);
    await write(txtStr);
  }
  await disconnect();
}

export default {printToNativePrinter};
