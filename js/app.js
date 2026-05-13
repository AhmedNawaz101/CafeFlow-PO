import db from './database.js';
import cartMod from './cart.js';
import printer from './printer.js';
import receipt from './receipt.js';
import reports from './reports.js';

const SHOP_NAME = 'Mocha Coffee';
const DEFAULT_PIN = '0000';

const defaults = [
  { name: 'Cardamom Tea', price: 149, category: 'Hot', active: true },
  { name: 'Mocha', price: 149, category: 'Hot', active: true },
  { name: 'Cappuccino', price: 299, category: 'Hot', active: true },
  { name: 'Latte', price: 299, category: 'Hot', active: true },
  { name: 'Americano', price: 199, category: 'Hot', active: true },
  { name: 'Hot Chocolate', price: 299, category: 'Hot', active: true },
  { name: 'Caramel Latte', price: 349, category: 'Special', active: true },
  { name: 'Vanilla Latte', price: 349, category: 'Special', active: true },
  { name: 'Hazelnut Latte', price: 349, category: 'Special', active: true },
  { name: 'Cafe Comcah', price: 349, category: 'Special', active: true },
  { name: 'Iced Latte', price: 399, category: 'Cold', active: true },
  { name: 'Iced Caramel Latte', price: 399, category: 'Cold', active: true },
  { name: 'Iced Vanilla Latte', price: 399, category: 'Cold', active: true },
  { name: 'Iced Mocha', price: 399, category: 'Cold', active: true },
  { name: 'Iced Americano', price: 249, category: 'Cold', active: true },
  { name: 'Strawberry', price: 375, category: 'Smoothie', active: true },
  { name: 'Blueberry', price: 375, category: 'Smoothie', active: true },
  { name: 'Mango', price: 375, category: 'Smoothie', active: true },
  { name: 'Passion Fruit', price: 375, category: 'Smoothie', active: true },
  { name: 'Strawberry Chiller', price: 299, category: 'Chiller', active: true },
  { name: 'Blueberry Chiller', price: 299, category: 'Chiller', active: true },
  { name: 'Mango Chiller', price: 299, category: 'Chiller', active: true },
  { name: 'Passion Fruit Chiller', price: 299, category: 'Chiller', active: true },
  { name: 'Aura Charge', price: 350, category: 'Chiller', active: true },
];

let currentMode = null;
let cart = null;
let DISABLE_ANIMATIONS = false;

// Detect low-end device
function detectLowEndDevice() {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = navigator.deviceMemory || 4;
  const lowEnd = cores <= 2 || memory <= 2;
  if (lowEnd) console.log('Low-end device detected: optimizing performance');
  return lowEnd;
}

// Debounce utility
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ========== PAGE NAVIGATION ==========
function showPage(pageId) {
  // Hide all pages
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('order-page').classList.add('hidden');
  document.getElementById('admin-page').classList.add('hidden');
  document.getElementById('summary-page').classList.add('hidden');

  // Show selected page
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
}

async function initLandingPage() {
  document.getElementById('btn-order').addEventListener('click', () => initOrderMode());
  document.getElementById('btn-admin').addEventListener('click', async () => {
    const pinModal = document.getElementById('pin-modal');
    const pinInput = document.getElementById('pin-input');
    pinModal.classList.remove('hidden');
    pinInput.value = '';
    pinInput.focus();

    // PIN validation
    document.getElementById('pin-ok').onclick = async () => {
      if (pinInput.value === DEFAULT_PIN) {
        pinModal.classList.add('hidden');
        await initAdminMode();
      } else {
        alert('Incorrect PIN');
      }
    };

    document.getElementById('pin-cancel').onclick = () => {
      pinModal.classList.add('hidden');
    };
  });

  document.getElementById('btn-summary').addEventListener('click', () => initSummaryMode());
}

async function initOrderMode() {
  currentMode = 'order';
  cart = cartMod.createCart();
  showPage('order-page');

  await db.seedDrinksIfEmpty(defaults);
  await renderCategories();
  bindCartUI();

  // Search handler with debounce
  const search = document.getElementById('menu-search');
  if (search) {
    const debouncedRender = debounce(() => renderMenu(), 300);
    search.addEventListener('input', debouncedRender);
  }

  // Back button - use onclick for reliability
  const backBtn = document.getElementById('back-from-order');
  if (backBtn) {
    backBtn.onclick = () => {
      showPage('landing-page');
      currentMode = null;
    };
  }

  // POS Admin Button
  const adminBtnPos = document.getElementById('btn-admin-pos');
  if (adminBtnPos) {
    adminBtnPos.onclick = async () => {
      const pinModal = document.getElementById('pin-modal');
      const pinInput = document.getElementById('pin-input');
      pinModal.classList.remove('hidden');
      pinInput.value = '';
      pinInput.focus();

      document.getElementById('pin-ok').onclick = async () => {
        if (pinInput.value === DEFAULT_PIN) {
          pinModal.classList.add('hidden');
          await initAdminMode();
        } else {
          alert('Incorrect PIN');
        }
      };

      document.getElementById('pin-cancel').onclick = () => {
        pinModal.classList.add('hidden');
      };
    };
  }
}

async function initAdminMode() {
  currentMode = 'admin';
  showPage('admin-page');

  await db.seedDrinksIfEmpty(defaults);
  await renderAdmin();

  // Back button - use onclick for reliability
  const backBtn = document.getElementById('back-from-admin');
  if (backBtn) {
    backBtn.onclick = () => {
      showPage('landing-page');
      currentMode = null;
    };
  }
}

async function initSummaryMode() {
  currentMode = 'summary';
  showPage('summary-page');

  await renderSummaryPage();

  // Back button - use onclick for reliability
  const backBtn = document.getElementById('back-from-summary');
  if (backBtn) {
    backBtn.onclick = () => {
      showPage('landing-page');
      currentMode = null;
    };
  }
}

// ========== ORDER MODE FUNCTIONS ==========
function getActiveCategory() {
  const tabs = document.querySelectorAll('.category-tab');
  for (const t of tabs) if (t.classList.contains('active')) return t.dataset.cat;
  return 'All';
}

async function renderCategories() {
  const drinks = await db.listDrinks();
  const cats = new Set(['All']);
  drinks.forEach(d => cats.add(d.category || 'Other'));
  const container = document.getElementById('category-tabs');
  if (!container) return;
  container.innerHTML = '';
  for (const c of cats) {
    const b = document.createElement('button');
    b.className = 'category-tab';
    b.textContent = c;
    b.dataset.cat = c;
    if (c === 'All') b.classList.add('active');
    b.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderMenu();
    });
    container.appendChild(b);
  }
}

async function renderMenu() {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  const drinks = await db.listDrinks();
  const searchVal = (document.getElementById('menu-search')?.value || '').toLowerCase();
  const activeCategory = getActiveCategory();

  let filtered = drinks.filter(d => d.active !== false);

  if (activeCategory !== 'All') {
    filtered = filtered.filter(d => d.category === activeCategory);
  }

  if (searchVal) {
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(searchVal) ||
      (d.category || '').toLowerCase().includes(searchVal)
    );
  }

  const byCategory = new Map();
  for (const d of filtered) {
    const cat = d.category || 'Other';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat).push(d);
  }

  const fragment = document.createDocumentFragment();

  function makeSection(title, items) {
    if (items.length === 0) return null;

    const sec = document.createElement('div');
    sec.className = 'menu-section';
    const h = document.createElement('div');
    h.className = 'section-title';
    h.textContent = title;
    sec.appendChild(h);
    const list = document.createElement('div');
    list.className = 'section-list';

    for (const d of items) {
      const row = document.createElement('div');
      row.className = 'menu-row';

      const left = document.createElement('div');
      left.className = 'menu-name';
      left.textContent = d.name;

      const right = document.createElement('div');
      right.className = 'menu-price';
      right.textContent = `Rs ${(+d.price).toFixed(0)}`;

      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener('click', function (evt) {
        if (!DISABLE_ANIMATIONS) triggerAddItemAnimation(evt.target.closest('.menu-row'));
        cart.add(d);
        renderCart();
      });

      list.appendChild(row);
    }
    sec.appendChild(list);
    return sec;
  }

  for (const [cat, items] of byCategory) {
    const section = makeSection(cat.toUpperCase(), items);
    if (section) fragment.appendChild(section);
  }

  grid.innerHTML = '';
  grid.appendChild(fragment);
}

function triggerAddItemAnimation(element) {
  if (DISABLE_ANIMATIONS) return;

  // Simplified animation - no reflow triggers
  try {
    element.style.animation = 'bounce 0.3s ease-in-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 300);
  } catch (e) {
    // Fail silently
  }

  // Simple indicator without complex positioning
  if (DISABLE_ANIMATIONS) return;

  const indicator = document.createElement('div');
  indicator.textContent = '+1';
  indicator.style.cssText = 'position:fixed;pointer-events:none;color:#E8B85C;font-weight:800;font-size:16px;z-index:999;opacity:1;transition:opacity 0.4s ease-out';

  const rect = element.getBoundingClientRect();
  indicator.style.left = (rect.left + rect.width / 2 - 8) + 'px';
  indicator.style.top = (rect.top + rect.height / 2 - 8) + 'px';

  document.body.appendChild(indicator);

  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 400);
  }, 100);
}

function renderCart() {
  const itemsDiv = document.getElementById('cart-items');
  const items = cart.list();

  const fragment = document.createDocumentFragment();

  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.dataset.drinkId = it.drink_id;

    let startX = 0;
    let currentX = 0;

    row.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    });

    row.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;

      if (diff > 10) {
        row.style.transform = `translateX(-${Math.min(diff, 100)}px)`;
        row.style.opacity = Math.max(0.3, 1 - (diff / 200));
      }
    });

    row.addEventListener('touchend', () => {
      const diff = startX - currentX;
      if (diff > 50) {
        if (!DISABLE_ANIMATIONS) {
          row.style.animation = 'slideOut 0.3s ease-out forwards';
          setTimeout(() => {
            cart.remove(it.drink_id);
            renderCart();
          }, 300);
        } else {
          cart.remove(it.drink_id);
          renderCart();
        }
      } else {
        row.style.transform = 'translateX(0)';
        row.style.opacity = '1';
      }
    });

    const left = document.createElement('div');
    left.textContent = `${it.name}`;
    left.style.flex = '1';

    const controls = document.createElement('div');

    const dec = document.createElement('button');
    dec.textContent = '-';
    const qty = document.createElement('span');
    qty.className = 'qty';
    qty.textContent = it.quantity;
    const inc = document.createElement('button');
    inc.textContent = '+';

    const rem = document.createElement('button');
    rem.textContent = '✕';
    rem.title = 'Remove item';

    dec.addEventListener('click', () => { cart.decrease(it.drink_id); renderCart(); });
    inc.addEventListener('click', () => { cart.add({ id: it.drink_id, price_each: it.price_each, name: it.name, price: it.price_each }); renderCart(); });
    rem.addEventListener('click', () => { cart.remove(it.drink_id); renderCart(); });

    controls.appendChild(dec);
    controls.appendChild(qty);
    controls.appendChild(inc);

    const subtotal = document.createElement('div');
    subtotal.textContent = `Rs ${it.subtotal.toFixed(0)}`;
    subtotal.style.minWidth = '70px';
    subtotal.style.textAlign = 'right';

    row.appendChild(left);
    row.appendChild(controls);
    row.appendChild(subtotal);
    row.appendChild(rem);

    fragment.appendChild(row);
  }

  itemsDiv.innerHTML = '';
  itemsDiv.appendChild(fragment);

  const total = cart.total();
  const subtotalDiv = document.getElementById('subtotal');
  subtotalDiv.textContent = `Rs ${total.toFixed(0)}`;

  const floatingCheckout = document.getElementById('floating-checkout');
  const floatingTotalAmount = document.getElementById('floating-total-amount');

  floatingTotalAmount.textContent = `Rs ${total.toFixed(0)}`;

  const completeBtn = document.getElementById('complete-order');
  if (items.length > 0) {
    if (!DISABLE_ANIMATIONS) completeBtn.classList.add('pulse');
    floatingCheckout.classList.remove('hidden');
  } else {
    completeBtn.classList.remove('pulse');
    floatingCheckout.classList.add('hidden');
  }
}

function bindCartUI() {
  document.getElementById('cart-clear-btn').addEventListener('click', () => {
    cart.clear();
    renderCart();
  });

  document.getElementById('complete-order').addEventListener('click', async () => {
    if (cart.list().length === 0) return alert('Cart is empty');
    try {
      await cart.checkout(async (order, items) => {
        // Print receipt immediately using printer module
        try {
          await printer.printReceipt(SHOP_NAME, order, items);
        } catch (e) {
          console.error('Print failed:', e.message);
          alert('Print failed: ' + e.message);
        }
      });
      alert('Order completed successfully!');
      await renderMenu();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    renderCart();
  });
}

// ========== ADMIN MODE FUNCTIONS ==========
async function renderAdmin() {
  const list = document.getElementById('drinks-list');
  list.innerHTML = '';
  const drinks = await db.listDrinks();
  for (const d of drinks) {
    const row = document.createElement('div');
    row.className = 'drinks-item';
    const left = document.createElement('div');
    left.textContent = `${d.name} - Rs${(+d.price).toFixed(0)}`;
    const right = document.createElement('div');
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    const disable = document.createElement('button');
    disable.textContent = d.active === false ? 'Enable' : 'Disable';
    edit.addEventListener('click', async () => {
      const nv = prompt('New price for ' + d.name, String(d.price));
      if (nv !== null) { await db.updateDrink(d.id, { price: +nv }); await renderAdmin(); }
    });
    disable.addEventListener('click', async () => { await db.updateDrink(d.id, { active: d.active === false }); await renderAdmin(); });
    right.appendChild(edit);
    right.appendChild(disable);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }

  document.getElementById('add-drink-btn').onclick = async () => {
    const name = document.getElementById('new-drink-name').value.trim();
    const price = parseFloat(document.getElementById('new-drink-price').value);
    const category = document.getElementById('new-drink-category').value.trim() || 'Other';
    if (!name || isNaN(price)) return alert('Provide name and price');
    await db.addDrink({ name, price, category, active: true });
    document.getElementById('new-drink-name').value = '';
    document.getElementById('new-drink-price').value = '';
    document.getElementById('new-drink-category').value = '';
    await renderAdmin();
  };

  const analyticsDiv = document.getElementById('analytics');
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = start + 86400000 - 1;
  const rpt = await reports.getSummary(start, end);
  analyticsDiv.innerHTML = `<strong>Today's Summary</strong><br/>Total Revenue: Rs${rpt.totalToday}<br/>Drinks Sold: ${rpt.itemsSold}<br/>Most Sold: ${rpt.mostSold || '—'}`;

  document.getElementById('generate-report-btn').onclick = async () => {
    await showMonthlyReport();
  };

  document.getElementById('summary-view-btn').onclick = async () => {
    await showMonthlySummary();
  };

  document.getElementById('export-month').onclick = async () => {
    try {
      const csv = await reports.exportMonthlyCSV();
      if (window.Capacitor && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share) {
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const Share = window.Capacitor.Plugins.Share;
        const fileName = `monthly_report_${Date.now()}.csv`;
        const res = await Filesystem.writeFile({
          path: fileName,
          data: csv,
          directory: 'CACHE',
          encoding: 'utf8'
        });
        await Share.share({
          title: 'Monthly Report',
          text: 'Here is your monthly sales report.',
          url: res.uri,
          dialogTitle: 'Share CSV'
        });
      } else {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monthly_report.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };
}

async function showMonthlyReport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthlyData = await reports.getDetailedMonthlyReport(year, month);

  let html = `
    <div class="monthly-report-modal">
      <div class="report-header">
        <h2>Monthly Report - ${monthlyData.monthName} ${year}</h2>
        <button class="close-report">✕</button>
      </div>

      <div class="report-content">
        <div class="report-section stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">Rs ${monthlyData.totalRevenue.toLocaleString()}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Drinks Sold</div>
            <div class="stat-value">${monthlyData.totalDrinksSold}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Orders</div>
            <div class="stat-value">${monthlyData.totalOrders}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Avg Order Value</div>
            <div class="stat-value">Rs ${monthlyData.averageOrderValue}</div>
          </div>
        </div>

        <div class="report-section">
          <h3>Top 5 Most Sold Drinks</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Drink Name</th>
                <th>Quantity</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.topDrinks.map((drink, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${drink.name}</td>
                  <td>${drink.quantity}</td>
                  <td>Rs. ${Math.round(drink.revenue).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="report-section">
          <h3>Recent Orders (Last 50)</h3>
          <table class="report-table" style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em;">
            <thead style="background: #2c1810; color: #fff;">
              <tr>
                <th style="padding: 8px;">Order #</th>
                <th style="padding: 8px;">Date/Time</th>
                <th style="padding: 8px;">Items Sold</th>
                <th style="padding: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.orderHistory.map(o => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 8px; text-align: center;">${o.receiptNo.toString().padStart(6, '0')}</td>
                  <td style="padding: 8px; text-align: center;">${new Date(o.datetime).toLocaleString()}</td>
                  <td style="padding: 8px;">${o.itemsSummary}</td>
                  <td style="padding: 8px; text-align: right;">Rs. ${Math.round(o.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="report-footer">
          <p>Report Period: ${monthlyData.dateRange.start} to ${monthlyData.dateRange.end}</p>
          <button class="btn-export-pdf" id="pdf-export-btn">Print/Export as PDF</button>
        </div>
      </div>
    </div>
  `;

  const modal = document.createElement('div');
  modal.className = 'report-modal hidden';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  modal.classList.remove('hidden');

  modal.querySelector('.close-report').addEventListener('click', () => {
    modal.classList.add('hidden');
    setTimeout(() => document.body.removeChild(modal), 300);
  });

  modal.querySelector('#pdf-export-btn').addEventListener('click', () => {
    if (window.printer && typeof window.printer.printHtmlContent === 'function') {
      window.printer.printHtmlContent(html);
    } else {
      printer.printHtmlContent(html);
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      setTimeout(() => document.body.removeChild(modal), 300);
    }
  });
}

async function showMonthlySummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthlyData = await reports.getDetailedMonthlyReport(year, month);

  let html = `
    <div class="monthly-summary-modal">
      <div class="summary-header">
        <h2>📊 Monthly Summary - ${monthlyData.monthName} ${year}</h2>
        <button class="close-summary">✕</button>
      </div>

      <div class="summary-content">
        <div class="summary-metrics">
          <div class="metric-card primary">
            <div class="metric-icon">💰</div>
            <div class="metric-info">
              <div class="metric-label">Total Revenue</div>
              <div class="metric-value">Rs ${monthlyData.totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">☕</div>
            <div class="metric-info">
              <div class="metric-label">Drinks Sold</div>
              <div class="metric-value">${monthlyData.totalDrinksSold}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📝</div>
            <div class="metric-info">
              <div class="metric-label">Total Orders</div>
              <div class="metric-value">${monthlyData.totalOrders}</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-info">
              <div class="metric-label">Avg Order Value</div>
              <div class="metric-value">Rs ${monthlyData.averageOrderValue}</div>
            </div>
          </div>
        </div>

        <div class="summary-section">
          <h3>🏆 Top 3 Most Sold Drinks</h3>
          <div class="top-performers">
            ${monthlyData.topDrinks.slice(0, 3).map((drink, idx) => `
              <div class="performer-card rank-${idx + 1}">
                <div class="rank-badge">#${idx + 1}</div>
                <div class="performer-name">${drink.name}</div>
                <div class="performer-stats">
                  <div>Qty: ${drink.quantity}</div>
                  <div>Rs ${Math.round(drink.revenue)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="summary-section">
          <h3>📂 Sales by Category</h3>
          <div class="category-breakdown">
            ${monthlyData.categoryBreakdown.map(cat => {
    const percentage = ((cat.quantity / monthlyData.totalDrinksSold) * 100).toFixed(1);
    return `
              <div class="category-item">
                <div class="category-name">${cat.category}</div>
                <div class="category-bar">
                  <div class="category-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="category-stats">
                  <span>${cat.quantity} items</span>
                  <span>Rs ${Math.round(cat.revenue)}</span>
                  <span>${percentage}%</span>
                </div>
              </div>
            `}).join('')}
          </div>
        </div>

        <div class="summary-footer">
          <p class="period">Report for ${monthlyData.dateRange.start} to ${monthlyData.dateRange.end}</p>
          <div class="summary-actions">
            <button class="btn-close-summary">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  container.querySelector('.close-summary').addEventListener('click', () => {
    container.remove();
  });

  container.querySelector('.btn-close-summary').addEventListener('click', () => {
    container.remove();
  });

  container.addEventListener('click', (e) => {
    if (e.target === container) {
      container.remove();
    }
  });
}

// ========== SUMMARY MODE FUNCTIONS ==========
async function renderSummaryPage() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = start + 86400000 - 1;
  const todayReport = await reports.getSummary(start, end);

  const quickStats = document.getElementById('quick-stats');
  quickStats.innerHTML = `
    <div class="quick-stat">
      <div class="stat-icon">💰</div>
      <div class="stat-details">
        <div class="stat-label">Today's Revenue</div>
        <div class="stat-number">Rs ${todayReport.totalToday}</div>
      </div>
    </div>
    <div class="quick-stat">
      <div class="stat-icon">☕</div>
      <div class="stat-details">
        <div class="stat-label">Today's Drinks Sold</div>
        <div class="stat-number">${todayReport.itemsSold}</div>
      </div>
    </div>
    <div class="quick-stat">
      <div class="stat-icon">🏆</div>
      <div class="stat-details">
        <div class="stat-label">Most Sold</div>
        <div class="stat-number">${todayReport.mostSold || 'None'}</div>
      </div>
    </div>
  `;

  // Bind button handlers directly
  const summaryBtn = document.getElementById('show-monthly-summary-btn');
  if (summaryBtn) {
    summaryBtn.onclick = () => { showMonthlySummary(); };
  }

  const reportBtn = document.getElementById('show-monthly-report-btn');
  if (reportBtn) {
    reportBtn.onclick = () => { showMonthlyReport(); };
  }

  const csvBtn = document.getElementById('export-csv-btn');
  if (csvBtn) {
    csvBtn.onclick = async () => {
      try {
        const csv = await reports.exportMonthlyCSV();
        if (window.Capacitor && window.Capacitor.Plugins.Filesystem && window.Capacitor.Plugins.Share) {
          const { Filesystem, Share } = window.Capacitor.Plugins;
          const fileName = `monthly_report_${Date.now()}.csv`;
          const res = await Filesystem.writeFile({
            path: fileName,
            data: csv,
            directory: 'CACHE',
            encoding: 'utf8'
          });
          await Share.share({
            title: 'Monthly Report',
            text: 'Here is your monthly sales report.',
            url: res.uri,
            dialogTitle: 'Share CSV'
          });
        } else {
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'monthly_report.csv';
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        alert("Export failed: " + err.message);
      }
    };
  }
}

async function migrateDrinkNames() {
  const drinks = await db.listDrinks();
  for (const d of drinks) {
    let name = d.name;
    if (name === 'Aura Fresh') name = 'Aura Charge';
    else if (name === 'Café Mocha' || name === 'Cafe Mocha') name = 'Cafe Comcah';
    if (name !== d.name) await db.updateDrink(d.id, { name });
  }
}

// ========== INITIALIZATION ==========
async function init() {
  DISABLE_ANIMATIONS = detectLowEndDevice();

  await db.seedDrinksIfEmpty(defaults);
  await migrateDrinkNames();
  await initLandingPage();
  showPage('landing-page');
}

// Start app
window.addEventListener('DOMContentLoaded', init);
