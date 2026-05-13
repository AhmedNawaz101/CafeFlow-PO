// receipt.js - Professional Receipt Generation System
// Generates stylized receipts for thermal printer or PDF with auto-incrementing order numbers

let orderCounter = localStorage.getItem('orderCounter') ? parseInt(localStorage.getItem('orderCounter')) : 1000;

function getNextOrderNumber(){
  orderCounter++;
  localStorage.setItem('orderCounter', orderCounter);
  return orderCounter;
}

function buildESCPOSReceipt(shopName, order, items){
  // Professional thermal receipt with MOCHA COFFEE HOUSE branding (KFC Style)
  const orderNum = order.orderNumber || '0000';
  const date = new Date(order.datetime);
  const dateStr = date.toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const lines = [];
  
  // Header
  lines.push('╔═══════════════════════════════╗');
  lines.push('║  MOCHA COFFEE HOUSE           ║');
  lines.push('║  Premium Coffee Experience    ║');
  lines.push('╚═══════════════════════════════╝');
  lines.push('');
  
  // Order Info
  lines.push(`Order ID: ${orderNum.toString().padStart(6, '0')}`);
  lines.push(`${dateStr} ${timeStr}`);
  lines.push('───────────────────────────────');
  lines.push('');
  
  // Items - KFC Style with dots
  let total = 0;
  for(const item of items){
    const itemName = item.name.substring(0, 18).padEnd(18);
    const itemQty = `x${item.quantity}`;
    const itemPrice = `Rs ${Math.round(item.subtotal)}`;
    
    const dotCount = Math.max(1, 31 - itemName.length - itemQty.length - itemPrice.length);
    const line = `${itemName}${itemQty}${'.'.repeat(dotCount)}${itemPrice}`;
    
    lines.push(line);
    total += item.subtotal;
  }
  
  lines.push('───────────────────────────────');
  
  // Total
  const totalLine = 'TOTAL';
  const totalAmount = `Rs ${Math.round(total)}`;
  const totalDots = Math.max(1, 31 - totalLine.length - totalAmount.length);
  lines.push(`${totalLine}${'.'.repeat(totalDots)}${totalAmount}`);
  
  lines.push('═══════════════════════════════');
  lines.push('');
  lines.push('    THANK YOU FOR VISITING!');
  lines.push('       COME AGAIN SOON');
  lines.push('');
  lines.push('═══════════════════════════════');

  // Build ESC/POS bytes
  const parts = [];
  parts.push(new Uint8Array([0x1B, 0x40])); // ESC @
  parts.push(new Uint8Array([0x1B, 0x21, 0x00])); // ESC ! 0
  
  for(const line of lines){
    parts.push(new TextEncoder().encode(line + '\n'));
  }
  
  parts.push(new Uint8Array([0x1D, 0x56, 0x41, 0x10])); // GS V A n (cut)
  
  let totalLen = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLen);
  let offset = 0;
  for(const part of parts){
    output.set(part, offset);
    offset += part.length;
  }
  
  return output;
}

function buildHTMLReceipt(shopName, order, items){
  const orderNum = order.orderNumber || '0000';
  const date = new Date(order.datetime);
  const dateStr = date.toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let subtotal = 0;
  let itemsHTML = '';

  for(const item of items){
    const itemPrice = item.subtotal;
    const itemName = item.name.padEnd(22);
    const qty = `x${item.quantity}`.padStart(3);
    const price = `Rs ${Math.round(itemPrice)}`.padStart(12);
    itemsHTML += `<div style="font-family: monospace; font-size: 12px; padding: 4px 0; border-bottom: 1px dotted #ccc;">
      <span>${itemName}</span><span style="float: right;">${qty} ${price}</span>
    </div>`;
    subtotal += itemPrice;
  }

  const total = subtotal;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt #${orderNum}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Arial', sans-serif;
          width: 320px;
          margin: 0 auto;
          background: #f5f5f5;
          padding: 10px;
        }
        .receipt-container {
          background: white;
          padding: 0;
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          border: 2px solid #2c1810;
          max-width: 100%;
        }
        .receipt-header {
          background: linear-gradient(135deg, #6b4423 0%, #8b5a3c 100%);
          color: white;
          padding: 20px 15px;
          text-align: center;
          border-bottom: 3px solid #2c1810;
        }
        .receipt-logo {
          height: 80px;
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .receipt-logo img {
          height: 100%;
          object-fit: contain;
        }
        .shop-name {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .shop-subtitle {
          font-size: 11px;
          letter-spacing: 1px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .divider-gold {
          height: 2px;
          background: linear-gradient(90deg, transparent, #d4a574, transparent);
          margin: 8px 0;
        }
        .receipt-order-info {
          background: #f9f7f4;
          padding: 12px 15px;
          border-bottom: 1px solid #e0d5c7;
          font-family: 'Courier New', monospace;
          font-size: 11px;
        }
        .order-id {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 4px;
          color: #2c1810;
        }
        .order-datetime {
          color: #666;
          font-size: 10px;
        }
        .receipt-items {
          padding: 15px;
          border-bottom: 2px solid #2c1810;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          padding: 6px 0;
          border-bottom: 1px dotted #ddd;
          align-items: center;
        }
        .item-row:last-child {
          border-bottom: none;
        }
        .item-name {
          flex: 1;
          color: #333;
          font-weight: 500;
        }
        .item-qty {
          width: 35px;
          text-align: center;
          color: #666;
        }
        .item-price {
          width: 70px;
          text-align: right;
          color: #2c1810;
          font-weight: bold;
        }
        .receipt-totals {
          padding: 15px;
          background: #faf8f5;
          border-bottom: 2px solid #2c1810;
        }
        .subtotal-row {
          display: flex;
          justify-content: space-between;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          margin-bottom: 6px;
          color: #666;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          color: #2c1810;
          padding-top: 8px;
          border-top: 2px solid #2c1810;
        }
        .receipt-footer {
          padding: 15px;
          text-align: center;
          background: linear-gradient(135deg, #6b4423 0%, #8b5a3c 100%);
          color: white;
        }
        .thank-you {
          font-size: 13px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .footer-text {
          font-size: 10px;
          opacity: 0.9;
          line-height: 1.6;
        }
        .footer-divider {
          border-top: 1px solid rgba(255,255,255,0.3);
          margin: 10px 0;
          padding-top: 10px;
        }
        @media print {
          body { margin: 0; padding: 0; background: white; width: 80mm; }
          .receipt-container { box-shadow: none; border: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="receipt-logo">
            <img src="logo.png" alt="Mocha Coffee Logo">
          </div>
          <div class="shop-name">Mocha Coffee</div>
          <div class="shop-subtitle">Premium Coffee Experience</div>
          <div class="divider-gold"></div>
        </div>

        <div class="receipt-order-info">
          <div class="order-id">ORDER #${orderNum.toString().padStart(6, '0')}</div>
          <div class="order-datetime">${dateStr} | ${timeStr}</div>
        </div>

        <div class="receipt-items">
          ${itemsHTML}
        </div>

        <div class="receipt-totals">
          <div class="subtotal-row">
            <span>Subtotal</span>
            <span>Rs ${Math.round(total)}</span>
          </div>
          <div class="total-row">
            <span>TOTAL</span>
            <span>Rs ${Math.round(total)}</span>
          </div>
        </div>

        <div class="receipt-footer">
          <div class="thank-you">✓ Thank You!</div>
          <div class="footer-text">
            <div>Your satisfaction is our priority</div>
            <div class="footer-divider"></div>
            <div>Come again soon!</div>
            <div style="margin-top: 8px; font-size: 9px; opacity: 0.8;">
              ════════════════════════════
            </div>
          </div>
        </div>
      </div>
      <script>
        // Restore logo path for web view
        (function(){
          try {
            const img = document.querySelector('.receipt-logo img');
            if(img && typeof window.getReceiptLogoBase64 === 'function'){
              window.getReceiptLogoBase64().then(base64 => {
                img.src = base64;
              });
            }
          }catch(e){}
          setTimeout(() => { window.print(); }, 100);
        })();
      </script>
    </body>
    </html>
  `;
}

export default { 
  getNextOrderNumber,
  buildESCPOSReceipt, 
  buildHTMLReceipt 
};
