// receipt.js - Thermal Printer Slip (KFC-style, monochrome, professional)

let orderCounter = localStorage.getItem('orderCounter') ? parseInt(localStorage.getItem('orderCounter')) : 1000;

function getNextOrderNumber() {
  orderCounter++;
  localStorage.setItem('orderCounter', orderCounter);
  return orderCounter;
}

// 80mm paper, 72mm print width, 576 dots/line
// Font A is 12 dots wide => 576/12 = 48 columns
const WIDTH = 48;

function center(text) {
  const len = text.length;
  if (len >= WIDTH) return text;
  const pad = Math.floor((WIDTH - len) / 2);
  return ' '.repeat(pad) + text;
}

function line(char = '-') {
  return char.repeat(WIDTH);
}

function buildESCPOSReceipt(shopName, order, items) {
  const orderNum = order.orderNumber || '0000';
  const date = new Date(order.datetime);
  const dateStr = date.toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const brand = (shopName || 'MOCHA COFFEE').toUpperCase();

  let r = '';
  r += line('=') + '\n';
  r += center(brand) + '\n';
  r += center('ORDER SLIP') + '\n';
  r += line('=') + '\n\n';
  r += center('Order #' + orderNum.toString().padStart(5, '0')) + '\n';
  r += center(dateStr + '  ' + timeStr) + '\n\n';
  r += line('-') + '\n';

  let total = 0;
  let itemCount = 0;

  for (const item of items) {
    const name = item.name;
    const qty = item.quantity;
    const price = Math.round(item.subtotal);
    const right = `x${String(qty).padStart(2)}  Rs${price.toString().padStart(7)}`;
    const nameLine = name.length > WIDTH - right.length ? name.substring(0, WIDTH - right.length) : name;
    const pad = WIDTH - nameLine.length - right.length;
    r += nameLine + (pad > 0 ? ' '.repeat(pad) : ' ') + right + '\n';
    total += item.subtotal;
    itemCount++;
  }

  r += line('-') + '\n';
  r += 'Items:'.padEnd(WIDTH - 10) + itemCount.toString().padStart(4) + '\n';
  r += line('=') + '\n';
  r += ('TOTAL'.padEnd(WIDTH - 10)) + ('Rs' + Math.round(total).toString().padStart(8)) + '\n';
  r += line('=') + '\n\n';
  r += center('Thank you!') + '\n';
  r += center('Visit again') + '\n\n';
  r += line('=') + '\n\n';

  return new TextEncoder().encode(r);
}

function buildHTMLReceipt(shopName, order, items, logoDataUrl) {
  const orderNum = order.orderNumber || '0000';
  const date = new Date(order.datetime);
  const dateStr = date.toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const brand = (shopName || 'Mocha Coffee').toUpperCase();

  let itemsHTML = '';
  let total = 0;
  let itemCount = 0;

  for (const item of items) {
    const price = Math.round(item.subtotal);
    itemsHTML += `
    <tr>
      <td class="item-name">${item.name}</td>
      <td class="item-qty">${item.quantity}</td>
      <td class="item-price">Rs ${price}</td>
    </tr>`;
    total += item.subtotal;
    itemCount++;
  }

  const totalRounded = Math.round(total);
  const logoSrc = logoDataUrl || 'logo.png';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Slip - ${brand}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      background: #fff;
      color: #000;
      font-size: 12px;
      line-height: 1.4;
      padding: 0;
      width: 80mm;
      margin: 0 auto;
    }
    .slip {
      width: 72mm;
      margin: 0 auto;
      padding: 10px 8px;
    }
    .logo-wrap {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #000;
    }
    .logo-wrap img {
      max-width: 120px;
      max-height: 80px;
      object-fit: contain;
      filter: grayscale(100%);
    }
    .brand {
      font-weight: bold;
      font-size: 14px;
      letter-spacing: 1px;
      text-align: center;
      margin-bottom: 2px;
    }
    .slip-title {
      font-size: 10px;
      letter-spacing: 2px;
      text-align: center;
      margin-bottom: 12px;
    }
    .order-meta {
      text-align: center;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .divider { border-top: 1px dashed #000; margin: 10px 0; }
    .divider-thick { border-top: 2px solid #000; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    .item-name { padding: 4px 0; }
    .item-qty { text-align: center; padding: 4px 4px; }
    .item-price { text-align: right; padding: 4px 0; }
    .total-row {
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 8px;
      font-weight: bold;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 2px solid #000;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .slip { border: none; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="slip">
    <div class="logo-wrap">
      <img src="${logoSrc}" alt="${brand}" onerror="this.style.display='none'">
    </div>
    <div class="brand">${brand}</div>
    <div class="slip-title">ORDER SLIP</div>
    <div class="order-meta">
      Order #${orderNum.toString().padStart(5, '0')} &nbsp;|&nbsp; ${dateStr} ${timeStr}
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr style="border-bottom: 1px solid #000;">
          <th style="text-align: left; padding-bottom: 4px;">Item</th>
          <th style="text-align: center; padding-bottom: 4px;">Qty</th>
          <th style="text-align: right; padding-bottom: 4px;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}
      </tbody>
    </table>
    <div class="divider-thick"></div>
    <div class="total-row">
      <span>TOTAL</span>
      <span>Rs ${totalRounded}</span>
    </div>
    <div class="footer">
      Thank you for your order.<br>
      Please visit again.
    </div>
  </div>
</body>
</html>`;
}

export default {
  getNextOrderNumber,
  buildESCPOSReceipt,
  buildHTMLReceipt
};
