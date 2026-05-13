// database.js - IndexedDB wrapper for Mocha Coffee POS
const DB_NAME = 'mocha_pos_v1';
const DB_VERSION = 1;

function openDB(){
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = (e) => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('drinks')){
        const s = db.createObjectStore('drinks',{keyPath:'id',autoIncrement:true});
        s.createIndex('name','name',{unique:false});
      }
      if(!db.objectStoreNames.contains('orders')){
        const s = db.createObjectStore('orders',{keyPath:'id',autoIncrement:true});
        s.createIndex('datetime','datetime',{unique:false});
      }
      if(!db.objectStoreNames.contains('order_items')){
        const s = db.createObjectStore('order_items',{keyPath:'id',autoIncrement:true});
        s.createIndex('order_id','order_id',{unique:false});
      }
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

async function withStore(storeName, mode, callback){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try{
      result = callback(store);
    }catch(err){
      reject(err);
    }
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
  });
}

export async function seedDrinksIfEmpty(defaults){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('drinks','readonly');
    const store = tx.objectStore('drinks');
    const rq = store.count();
    rq.onsuccess = async () => {
      if(rq.result === 0){
        const wtx = db.transaction('drinks','readwrite');
        const wstore = wtx.objectStore('drinks');
        for(const d of defaults) wstore.add(d);
        wtx.oncomplete = () => resolve(true);
        wtx.onerror = () => reject(wtx.error);
      }else resolve(false);
    };
    rq.onerror = () => reject(rq.error);
  });
}

export async function listDrinks(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('drinks','readonly');
    const store = tx.objectStore('drinks');
    const out = [];
    store.openCursor().onsuccess = (e)=>{
      const c = e.target.result;
      if(c){ out.push(c.value); c.continue(); } else resolve(out);
    };
    tx.onerror = ()=>reject(tx.error);
  });
}

export async function addDrink(drink){
  return withStore('drinks','readwrite', s=> s.add(drink));
}

export async function updateDrink(id, patch){
  return withStore('drinks','readwrite', s=>{
    const rq = s.get(id);
    rq.onsuccess = ()=>{
      const cur = rq.result || {};
      const updated = Object.assign({},cur,patch);
      s.put(updated);
    };
  });
}

export async function getDrink(id){
  return withStore('drinks','readonly', s=> s.get(id));
}

export async function addOrder(order, items){
  // order: {datetime, total_amount}
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(['orders','order_items'],'readwrite');
    const orders = tx.objectStore('orders');
    const itemsStore = tx.objectStore('order_items');
    const or = orders.add(order);
    or.onsuccess = (e)=>{
      const orderId = e.target.result;
      for(const it of items){
        const rec = Object.assign({},it,{order_id:orderId});
        itemsStore.add(rec);
      }
    };
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
  });
}

export async function listOrdersInRange(startTs, endTs){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('orders','readonly');
    const s = tx.objectStore('orders');
    const out=[];
    s.openCursor().onsuccess = e=>{
      const c = e.target.result;
      if(c){
        const v=c.value;
        if(v.datetime >= startTs && v.datetime <= endTs) out.push(v);
        c.continue();
      }else resolve(out);
    };
    tx.onerror = ()=>reject(tx.error);
  });
}

export async function getOrderItemsByOrder(orderId){
  return withStore('order_items','readonly', s=>{
    return new Promise((resolve,reject)=>{
      const out=[];
      const idx = s.index('order_id');
      idx.openCursor(IDBKeyRange.only(orderId)).onsuccess = e=>{
        const c = e.target.result;
        if(c){ out.push(c.value); c.continue(); } else resolve(out);
      };
    });
  });
}

export async function getAllOrderItems(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('order_items','readonly');
    const s = tx.objectStore('order_items');
    const out=[];
    s.openCursor().onsuccess = e=>{const c=e.target.result; if(c){out.push(c.value); c.continue();} else resolve(out)};
    tx.onerror = ()=>reject(tx.error);
  });
}

export async function clearDatabase() {
  // For testing only
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(['drinks','orders','order_items'],'readwrite');
    tx.objectStore('drinks').clear();
    tx.objectStore('orders').clear();
    tx.objectStore('order_items').clear();
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
  });
}

export default {openDB,seedDrinksIfEmpty,listDrinks,addDrink,updateDrink,addOrder,listOrdersInRange,getOrderItemsByOrder,getAllOrderItems,clearDatabase};
