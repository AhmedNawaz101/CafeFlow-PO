// admin.js - manager panel logic
import db from './database.js';
import reports from './reports.js';

const DEFAULT_PIN = '0000';

function longPress(element, ms, onTrigger){
  let t=0; let timer=null;
  element.addEventListener('pointerdown', ()=>{ timer = setTimeout(()=>{onTrigger();}, ms); });
  element.addEventListener('pointerup', ()=>{ clearTimeout(timer); });
  element.addEventListener('pointercancel', ()=>{ clearTimeout(timer); });
}

async function initAdminUI(){
  const logo = document.getElementById('logo-area');
  const adminBtn = document.getElementById('admin-quick-access');
  const adminModal = document.getElementById('admin-modal');
  const pinInput = document.getElementById('pin-input');
  const pinOk = document.getElementById('pin-ok');
  const pinCancel = document.getElementById('pin-cancel');
  const adminPanel = document.getElementById('admin-panel');
  const closeAdmin = document.getElementById('close-admin');

  // Long press on logo
  longPress(logo, 5000, ()=>{ adminModal.classList.remove('hidden'); pinInput.value=''; pinInput.focus(); });
  
  // Admin button
  if(adminBtn){
    adminBtn.addEventListener('click', ()=>{ adminModal.classList.remove('hidden'); pinInput.value=''; pinInput.focus(); });
  }
  
  pinCancel.addEventListener('click', ()=> adminModal.classList.add('hidden'));
  pinOk.addEventListener('click', async ()=>{
    if(pinInput.value === DEFAULT_PIN){
      adminModal.classList.add('hidden'); adminPanel.classList.remove('hidden'); await renderAdmin();
    }else alert('Incorrect PIN');
  });
  closeAdmin.addEventListener('click', ()=> adminPanel.classList.add('hidden'));
}

async function renderAdmin(){
  const list = document.getElementById('drinks-list');
  list.innerHTML='';
  const drinks = await db.listDrinks();
  for(const d of drinks){
    const row = document.createElement('div'); row.className='drinks-item';
    const left = document.createElement('div'); left.textContent = `${d.name} - Rs${(+d.price).toFixed(0)}`;
    const right = document.createElement('div');
    const edit = document.createElement('button'); edit.textContent='Edit';
    const disable = document.createElement('button'); disable.textContent = d.active===false? 'Enable': 'Disable';
    edit.addEventListener('click', async ()=>{
      const nv = prompt('New price for '+d.name, String(d.price));
      if(nv!==null){ await db.updateDrink(d.id, {price: +nv}); await renderAdmin(); }
    });
    disable.addEventListener('click', async ()=>{ await db.updateDrink(d.id, {active: !(d.active===false)}); await renderAdmin(); });
    right.appendChild(edit); right.appendChild(disable);
    row.appendChild(left); row.appendChild(right); list.appendChild(row);
  }
  // add drink
  document.getElementById('add-drink-btn').onclick = async ()=>{
    const name = document.getElementById('new-drink-name').value.trim();
    const price = parseFloat(document.getElementById('new-drink-price').value);
    const category = document.getElementById('new-drink-category').value.trim() || 'Other';
    if(!name || isNaN(price)) return alert('Provide name and price');
    await db.addDrink({name,price,category,active:true});
    document.getElementById('new-drink-name').value=''; 
    document.getElementById('new-drink-price').value='';
    document.getElementById('new-drink-category').value='';
    await renderAdmin();
  };

  // analytics
  const analyticsDiv = document.getElementById('analytics');
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const end = start + 86400000 - 1;
  const rpt = await reports.getSummary(start, end);
  analyticsDiv.innerHTML = `<strong>Today's Summary</strong><br/>Total Revenue: Rs${rpt.totalToday}<br/>Drinks Sold: ${rpt.itemsSold}<br/>Most Sold: ${rpt.mostSold || '—'}`;

  // Monthly Report
  document.getElementById('generate-report-btn').onclick = async ()=>{
    await showMonthlyReport();
  };
  
  // Summary View
  document.getElementById('summary-view-btn').onclick = async ()=>{
    await showMonthlySummary();
  };
  
  document.getElementById('export-month').onclick = async ()=>{
    const csv = await reports.exportMonthlyCSV();
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'monthly_report.csv'; a.click(); URL.revokeObjectURL(url);
  };
}

async function showMonthlySummary(){
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
        <!-- Key Metrics Grid -->
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

        <!-- Top Performers -->
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

        <!-- Category Performance -->
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
            <button class="btn-view-detailed" onclick="document.querySelector('.monthly-summary-modal').parentElement.remove(); showMonthlyReport();">View Detailed Report</button>
            <button class="btn-close-summary">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Create modal
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
  
  // Close button
  container.querySelector('.close-summary').addEventListener('click', ()=>{
    container.remove();
  });
  
  container.querySelector('.btn-close-summary').addEventListener('click', ()=>{
    container.remove();
  });
  
  // Close on outside click
  container.addEventListener('click', (e)=>{
    if(e.target === container){
      container.remove();
    }
  });
}


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
        <!-- Summary Stats -->
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
        
        <!-- Top 5 Drinks -->
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
        
        <!-- All Drinks Breakdown -->
        <div class="report-section">
          <h3>All Drinks Sold</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th>Drink Name</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.allDrinks.map(drink => `
                <tr>
                  <td>${drink.name}</td>
                  <td>${drink.quantity}</td>
                  <td>Rs ${drink.pricePerUnit}</td>
                  <td>Rs ${Math.round(drink.revenue).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Category Breakdown -->
        <div class="report-section">
          <h3>Sales by Category</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Items Sold</th>
                <th>Revenue</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.categoryBreakdown.map(cat => `
                <tr>
                  <td>${cat.category}</td>
                  <td>${cat.quantity}</td>
                  <td>Rs ${Math.round(cat.revenue).toLocaleString()}</td>
                  <td>${((cat.quantity / monthlyData.totalDrinksSold) * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="report-footer">
          <p>Report Period: ${monthlyData.dateRange.start} to ${monthlyData.dateRange.end}</p>
          <button class="btn-export-pdf" onclick="window.print()">Print/Export as PDF</button>
        </div>
      </div>
    </div>
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'report-modal hidden';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Close button
  modal.querySelector('.close-report').addEventListener('click', ()=>{
    modal.classList.add('hidden');
    setTimeout(()=> document.body.removeChild(modal), 300);
  });
  
  // Close on outside click
  modal.addEventListener('click', (e)=>{
    if(e.target === modal){
      modal.classList.add('hidden');
      setTimeout(()=> document.body.removeChild(modal), 300);
    }
  });
}

export default {initAdminUI, renderAdmin, showMonthlyReport, showMonthlySummary};
