// cart.js - cart/order logic
import db from './database.js';

function createCart(){
  const items = new Map();
  let isCheckingOut = false;

  function add(drink){
    const id = drink.id;
    if(items.has(id)){
      const cur = items.get(id);
      cur.quantity++;
    }else{
      items.set(id,{drink,quantity:1,price_each:drink.price});
    }
  }

  function decrease(id){
    if(!items.has(id)) return;
    const cur = items.get(id);
    cur.quantity--;
    if(cur.quantity<=0) items.delete(id);
  }

  function remove(id){ items.delete(id); }

  function clear(){ items.clear(); }

  function list(){
    return Array.from(items.values()).map(v=>({
      drink_id:v.drink.id,
      name:v.drink.name,
      quantity:v.quantity,
      price_each:v.price_each,
      subtotal: +(v.quantity * v.price_each)
    }));
  }

  function total(){
    return list().reduce((s,i)=>s + i.subtotal, 0);
  }

  async function checkout(printerCallback){
    if(isCheckingOut) throw new Error('Checkout already in progress');
    if(items.size===0) throw new Error('Cart empty');
    try{
      isCheckingOut = true;
      const order = {datetime: Date.now(), total_amount: total()};
      const itemsToSave = list().map(i=>({drink_id:i.drink_id, quantity:i.quantity, price_each:i.price_each, subtotal:i.subtotal, name:i.name}));
      await db.addOrder(order, itemsToSave);
      // send to printer
      if(typeof printerCallback==='function') await printerCallback(order, itemsToSave);
      clear();
      return true;
    }finally{ isCheckingOut = false; }
  }

  return {add,decrease,remove,clear,list,total,checkout};
}

export default {createCart};
