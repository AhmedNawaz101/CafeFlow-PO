// reports.js - analytics and reporting
import db from './database.js';

function groupBy(arr, key) {
  const out = new Map();
  for (const a of arr) { const k = a[key]; out.set(k, (out.get(k) || 0) + (a.quantity || 0)); }
  return out;
}

export async function getSummary(startTs, endTs) {
  const orders = await db.listOrdersInRange(startTs, endTs);
  const items = await db.getAllOrderItems();
  const orderIds = new Set(orders.map(o => o.id));
  const itemsInRange = items.filter(i => orderIds.has(i.order_id));

  const totalToday = orders.reduce((s, o) => s + o.total_amount, 0);
  // handle no items case
  if (itemsInRange.length === 0) {
    return { totalToday: totalToday || 0, itemsSold: 0, mostSold: 'None' };
  }

  const itemsSold = itemsInRange.reduce((s, i) => s + (i.quantity || 0), 0);
  const byDrink = groupBy(itemsInRange, 'drink_id');
  let mostSold = null; let mostQty = 0;
  for (const [k, v] of byDrink.entries()) { if (v > mostQty) { mostQty = v; mostSold = k; } }
  let mostName = null;
  if (mostSold !== null && mostSold !== undefined) {
    try {
      const dr = await db.getDrink(mostSold);
      mostName = dr ? dr.name : String(mostSold);
    } catch (err) {
      console.warn('Could not fetch drink name for ID', mostSold, err);
      mostName = String(mostSold);
    }
  }
  return { totalToday, itemsSold, mostSold: mostName };
}

export async function monthlyRevenue(year, month) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;
  const orders = await db.listOrdersInRange(start, end);
  const revenue = orders.reduce((s, o) => s + o.total_amount, 0);
  return { revenue, days: orders };
}

export async function exportMonthlyCSV() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const start = new Date(y, m, 1).getTime();
  const end = new Date(y, m + 1, 1).getTime() - 1;
  const orders = await db.listOrdersInRange(start, end);
  const items = await db.getAllOrderItems();

  const itemsByOrder = new Map();
  for (const i of items) {
    if (!itemsByOrder.has(i.order_id)) itemsByOrder.set(i.order_id, []);
    itemsByOrder.get(i.order_id).push(i);
  }

  let csv = 'Receipt_Order_No,DB_Order_ID,Date,Time,Item_Name,Quantity,Item_Price,Total_Amount\n';
  for (const o of orders) {
    const d = new Date(o.datetime);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString();
    const orderItems = itemsByOrder.get(o.id) || [];
    const receiptNo = o.orderNumber || o.id;

    if (orderItems.length === 0) {
      csv += `${receiptNo},${o.id},"${dateStr}","${timeStr}","(No items)",0,0,${o.total_amount}\n`;
    } else {
      for (const it of orderItems) {
        csv += `${receiptNo},${o.id},"${dateStr}","${timeStr}","${it.name}",${it.quantity},${it.price_each},${o.total_amount}\n`;
      }
    }
  }
  return csv;
}

export async function getDetailedMonthlyReport(year, month) {
  // Generate comprehensive monthly report with itemized breakdown
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;

  const orders = await db.listOrdersInRange(start, end);
  const allItems = await db.getAllOrderItems();
  const orderIds = new Set(orders.map(o => o.id));
  const itemsInRange = allItems.filter(i => orderIds.has(i.order_id));
  const allDrinks = await db.listDrinks();

  // Create drink lookup map
  const drinkMap = new Map();
  for (const drink of allDrinks) {
    drinkMap.set(drink.id, drink);
  }

  // Calculate totals
  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalDrinksSold = itemsInRange.reduce((s, i) => s + i.quantity, 0);
  const totalOrders = orders.length;

  // Group items by drink
  const itemsByDrink = new Map();
  for (const item of itemsInRange) {
    if (!itemsByDrink.has(item.drink_id)) {
      itemsByDrink.set(item.drink_id, {
        drinkId: item.drink_id,
        name: item.name || 'Unknown',
        quantity: 0,
        revenue: 0,
        pricePerUnit: item.price_each || 0
      });
    }
    const record = itemsByDrink.get(item.drink_id);
    record.quantity += item.quantity;
    record.revenue += item.subtotal;
  }

  // Convert to array and sort by quantity
  const drinkSales = Array.from(itemsByDrink.values())
    .sort((a, b) => b.quantity - a.quantity);

  // Get top 5 most sold drinks
  const topDrinks = drinkSales.slice(0, 5);

  // Calculate by category
  const byCategory = new Map();
  for (const drink of drinkSales) {
    const d = drinkMap.get(drink.drinkId);
    const category = d ? d.category : 'Other';
    if (!byCategory.has(category)) {
      byCategory.set(category, {
        category,
        quantity: 0,
        revenue: 0
      });
    }
    const catRecord = byCategory.get(category);
    catRecord.quantity += drink.quantity;
    catRecord.revenue += drink.revenue;
  }

  const categoryBreakdown = Array.from(byCategory.values())
    .sort((a, b) => b.quantity - a.quantity);

  // Group items by order for history
  const orderHistory = [];
  const sortedOrders = [...orders].sort((a, b) => b.datetime - a.datetime);
  for (const o of sortedOrders.slice(0, 50)) {
    const orderItems = itemsInRange.filter(i => i.order_id === o.id);
    const itemNames = orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
    orderHistory.push({
      receiptNo: o.orderNumber || o.id,
      datetime: o.datetime,
      itemsSummary: itemNames || 'No items',
      total: o.total_amount
    });
  }

  return {
    month,
    year,
    monthName: new Date(year, month).toLocaleString('en-US', { month: 'long' }),
    totalRevenue: totalRevenue ? Math.round(totalRevenue) : 0,
    totalDrinksSold: totalDrinksSold || 0,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round((totalRevenue || 0) / totalOrders) : 0,
    topDrinks: topDrinks || [],
    allDrinks: drinkSales || [],
    categoryBreakdown: categoryBreakdown || [],
    orderHistory: orderHistory || [],
    dateRange: {
      start: new Date(start).toLocaleDateString(),
      end: new Date(end).toLocaleDateString()
    }
  };
}

export default { getSummary, monthlyRevenue, exportMonthlyCSV, getDetailedMonthlyReport };
