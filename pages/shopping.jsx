import { requireAuth } from "@/lib/auth";
import { useMemo, useState, useRef } from "react";
import useLocalStorage from "@/utils/useLocalStorage";
import useMedia from "@/utils/useMedia";

const CAT_ORDER_DEFAULT = ["Produce","Dairy","Bakery","Pantry","Frozen","Baby","Household","Pharmacy","Other"];
const UNITS = ["x","kg","g","L","ml","pack"];
const QUICK_ADD = [
  { t:"Milk", c:"Dairy", u:"L" }, { t:"Bread", c:"Bakery", u:"x" }, { t:"Eggs", c:"Dairy", u:"x" },
  { t:"Bananas", c:"Produce", u:"x" }, { t:"Apples", c:"Produce", u:"x" }, { t:"Chicken", c:"Pantry", u:"kg" },
  { t:"Pasta", c:"Pantry", u:"x" }, { t:"Nappies", c:"Baby", u:"pack" }, { t:"Wipes", c:"Baby", u:"pack" },
  { t:"Detergent", c:"Household", u:"x" }
];

export default function Shopping() {
  const isPhone = useMedia("(max-width: 640px)");

  // Lists
  const [lists, setLists] = useLocalStorage("shopping-lists", {
    weekly:   { id:"weekly",   name:"Weekly Shop", items:[] },
    pharmacy: { id:"pharmacy", name:"Pharmacy",    items:[] },
    house:    { id:"house",    name:"Household",   items:[] }
  });
  const [currentId, setCurrentId] = useLocalStorage("shopping-current", "weekly");
  const current = lists[currentId] || Object.values(lists)[0];

  // UI toggles
  const [hideChecked, setHideChecked] = useLocalStorage("shopping-hide-checked", false);
  const [showPrices, setShowPrices]   = useLocalStorage("shopping-show-prices", false);

  // Category/filter
  const [filterCat, setFilterCat] = useLocalStorage("shopping-filter-cat", "All");
  const [filterText, setFilterText] = useLocalStorage("shopping-filter-text", "");

  // Add form
  const [text, setText] = useState("");
  const [qty, setQty]   = useState(1);
  const [unit, setUnit] = useState("x");
  const [cat, setCat]   = useState("Produce");

  // Bulk paste
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  function nowIso(){ return new Date().toISOString(); }
  function normalize(s){ return (s||"").trim().toLowerCase(); }
  const updateCurrent = (updater) =>
    setLists(prev => ({ ...prev, [current.id]: { ...current, items: updater(current.items || []) }}));

  // CRUD
  const addItem = (rawText, opt={qty, unit, cat}) => {
    const t = (rawText ?? text).trim();
    if(!t) return;
    const nText = normalize(t);
    updateCurrent(items => {
      const idx = items.findIndex(i => normalize(i.text)===nText && i.unit===opt.unit && i.category===opt.cat);
      if (idx >= 0) {
        const copy = [...items];
        copy[idx] = { ...copy[idx], qty: (copy[idx].qty || 1) + (opt.qty || 1) };
        return copy;
      }
      return [...items, {
        id: crypto.randomUUID(), text: t, qty: Number(opt.qty||1), unit: opt.unit||"x",
        category: opt.cat||"Other", bought:false, pinned:false, price:"", productUrl:"",
        lastChecked:null, priceStatus:""
      }];
    });
    if (rawText === undefined) { setText(""); setQty(1); setUnit("x"); setCat("Produce"); }
  };
  
  const toggle = (id) => updateCurrent(items => items.map(i => i.id===id ? { ...i, bought: !i.bought } : i));
  const pin    = (id) => updateCurrent(items => items.map(i => i.id===id ? { ...i, pinned: !i.pinned } : i));
  const remove = (id) => updateCurrent(items => items.filter(i => i.id!==id));
  const setField = (id, k, v) => updateCurrent(items => items.map(i => i.id===id ? { ...i, [k]: v } : i));
  const clearChecked = () => updateCurrent(items => items.filter(i => !i.bought));

  // Bulk paste
  const bulkAdd = () => {
    const lines = bulkText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    lines.forEach(line => addItem(line, { qty:1, unit:"x", cat:"Other" }));
    setBulkText(""); setBulkOpen(false);
  };

  // Lists CRUD
  const createList = () => {
    const name = prompt("New list name:"); if(!name) return;
    const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || "list";
    const id = (lists[idBase] ? `${idBase}-${Date.now()}` : idBase);
    setLists(p => ({ ...p, [id]: { id, name, items:[] } })); setCurrentId(id);
  };
  
  const renameList = () => { 
    const name = prompt("Rename list:", current.name); 
    if(!name) return; 
    setLists(p => ({ ...p, [current.id]: { ...current, name } })); 
  };
  
  const deleteList = () => {
    if(Object.keys(lists).length <= 1) return alert("You need at least one list.");
    if(!confirm(`Delete "${current.name}"?`)) return;
    const ids = Object.keys(lists).filter(id => id !== current.id);
    const nextId = ids[0]; const copy = { ...lists }; delete copy[current.id];
    setLists(copy); setCurrentId(nextId);
  };

  // Derived
  const rawItems = current.items || [];
  const filtered = useMemo(() => rawItems.filter(i => {
    if (hideChecked && i.bought) return false;
    if (filterCat !== "All" && i.category !== filterCat) return false;
    if (filterText && !normalize(i.text).includes(normalize(filterText))) return false;
    return true;
  }), [rawItems, hideChecked, filterCat, filterText]);

  const groups = useMemo(() => {
    const byCat = new Map();
    filtered.forEach(i => {
      const k = i.category || "Other";
      const arr = byCat.get(k) || [];
      arr.push(i); byCat.set(k, arr);
    });
    for (const [k, arr] of byCat) {
      arr.sort((a,b)=>{
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.bought !== b.bought) return a.bought ? 1 : -1;
        return a.text.localeCompare(b.text);
      });
    }
    const out = [];
    CAT_ORDER_DEFAULT.forEach(c => { if (byCat.has(c)) out.push([c, byCat.get(c)]) });
    for (const [k, arr] of byCat) { if(!CAT_ORDER_DEFAULT.includes(k)) out.push([k, arr]); }
    return out;
  }, [filtered]);

  const count = useMemo(()=>{
    const totalItems = rawItems.length;
    const done = rawItems.filter(i=>i.bought).length;
    return { totalItems, done, left: totalItems - done };
  }, [rawItems]);

  const total = useMemo(() =>
    rawItems.reduce((sum,i)=>sum + ((Number(i.price)||0) * (Number(i.qty)||1)), 0), [rawItems]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">🛒 Shopping Lists</h1>
          <p className="text-secondary mt-2">Manage your shopping efficiently with smart lists</p>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', minWidth: '300px' }}>
          <div className="stat-card">
            <div className="stat-value text-lg">{count.totalItems}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-lg">{count.left}</div>
            <div className="stat-label">Left</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-lg">{count.done}</div>
            <div className="stat-label">Done</div>
          </div>
        </div>
      </div>

      {/* Controls Card */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">List Controls</h3>
        </div>
        
        {/* List Selection */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="form-group">
            <label className="form-label">Current List</label>
            <select className="form-select" value={current.id} onChange={e=>setCurrentId(e.target.value)}>
              {Object.values(lists).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <button className="btn btn-secondary" onClick={createList} title="New list">
              ➕ New
            </button>
            <button className="btn btn-secondary" onClick={renameList} title="Rename">
              ✏️ Rename
            </button>
            <button className="btn btn-secondary" onClick={deleteList} title="Delete">
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Add Item Form */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Item Name</label>
            <input 
              className="form-input" 
              placeholder="Add an item..." 
              value={text} 
              onChange={e => setText(e.target.value)}
              onKeyDown={e => (e.key === 'Enter' ? addItem() : null)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input 
              className="form-input" 
              type="number" 
              min="1" 
              value={qty} 
              onChange={e => setQty(Number(e.target.value) || 1)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <select className="form-select" value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={cat} onChange={e => setCat(e.target.value)}>
              {CAT_ORDER_DEFAULT.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={addItem}>
              ➕ Add Item
            </button>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-6">
          <label className="form-label mb-3">Quick Add</label>
          <div className="flex gap-2 flex-wrap">
            {QUICK_ADD.map(q => (
              <button 
                key={q.t} 
                className="btn btn-ghost btn-sm" 
                onClick={() => addItem(q.t, { qty:1, unit:q.u, cat:q.c })}
              >
                {q.t}
              </button>
            ))}
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="grid grid-cols-4 gap-4">
          <div className="form-group">
            <label className="form-label">Filter by text</label>
            <input 
              className="form-input" 
              placeholder="Search items..." 
              value={filterText} 
              onChange={e => setFilterText(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Filter by category</label>
            <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="All">All Categories</option>
              {CAT_ORDER_DEFAULT.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <button 
              className={`btn ${hideChecked ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setHideChecked(v => !v)}
            >
              {hideChecked ? '👁️ Show All' : '🙈 Hide Done'}
            </button>
            <button 
              className={`btn ${showPrices ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowPrices(v => !v)}
            >
              {showPrices ? '💰 Hide Prices' : '💰 Show Prices'}
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <button className="btn btn-secondary" onClick={clearChecked}>
              🗑️ Clear Done
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => setBulkOpen(v => !v)}
            >
              📋 {bulkOpen ? 'Cancel' : 'Bulk Add'}
            </button>
          </div>
        </div>

        {/* Bulk Add */}
        {bulkOpen && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <label className="form-label">Paste items (one per line)</label>
            <textarea 
              className="form-input mt-2" 
              rows={5} 
              placeholder="Milk&#10;Bread&#10;Eggs&#10;..." 
              value={bulkText} 
              onChange={e => setBulkText(e.target.value)} 
            />
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={bulkAdd}>
                ➕ Add All Items
              </button>
              <button className="btn btn-secondary" onClick={() => setBulkOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shopping List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{current.name}</h3>
          {showPrices && (
            <div className="badge badge-primary">
              Total: €{total.toFixed(2)}
            </div>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-2">No items yet</h3>
            <p className="text-secondary">Add some items to get started with your shopping list</p>
          </div>
        ) : (
          groups.map(([category, items]) => {
            const checkedCount = items.filter(i => i.bought).length;
            return (
              <div key={category} className="mb-8">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                  <h4 className="text-lg font-semibold">{category}</h4>
                  <div className="flex gap-2">
                    <span className="badge badge-primary">
                      {items.length} items
                    </span>
                    {checkedCount > 0 && (
                      <span className="badge badge-success">
                        {checkedCount} done
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className={`shopping-item ${item.bought ? 'checked' : ''}`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!!item.bought} 
                          onChange={() => toggle(item.id)}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {item.text}
                            {item.qty > 1 && <span className="text-secondary"> × {item.qty}</span>}
                            {item.unit && item.unit !== "x" && <span className="text-secondary"> ({item.unit})</span>}
                            {item.pinned && <span className="ml-2">📌</span>}
                          </div>
                          {showPrices && item.price && (
                            <div className="text-sm text-secondary">
                              €{Number(item.price).toFixed(2)} each
                            </div>
                          )}
                        </div>
                      </label>

                      <div className="flex gap-2">
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => setField(item.id, "qty", Math.max(1, (item.qty || 1) - 1))}
                        >
                          −
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => setField(item.id, "qty", (item.qty || 1) + 1)}
                        >
                          +
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => pin(item.id)}
                          title={item.pinned ? "Unpin" : "Pin"}
                        >
                          {item.pinned ? "📌" : "📍"}
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => remove(item.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth();