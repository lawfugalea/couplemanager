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
  const [tripMode, setTripMode]       = useLocalStorage("shopping-trip-mode", false);
  const [showPrices, setShowPrices]   = useLocalStorage("shopping-show-prices", false);

  // Category/filter
  const [catOrder] = useLocalStorage("shopping-cats-order", CAT_ORDER_DEFAULT);
  const [filterCat, setFilterCat] = useLocalStorage("shopping-filter-cat", "All");
  const [filterText, setFilterText] = useLocalStorage("shopping-filter-text", "");

  // Add form (also used in sheet)
  const [text, setText] = useState("");
  const [qty, setQty]   = useState(1);
  const [unit, setUnit] = useState("x");
  const [cat, setCat]   = useState("Produce");

  // Bulk paste
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Price progress + summary
  const [checking, setChecking]         = useState(false);
  const [checkMsg, setCheckMsg]         = useState("");
  const [checkSummary, setCheckSummary] = useLocalStorage("shopping-price-summary", null);

  // Bottom sheet state
  const sheetRef = useRef(null);
  const [sheetType, setSheetType] = useState(null); // 'add' | {type:'item', id}
  function openSheet(payload){ setSheetType(payload); sheetRef.current?.showModal?.(); }
  function closeSheet(){ sheetRef.current?.close?.(); setSheetType(null); }

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
  const renameList = () => { const name = prompt("Rename list:", current.name); if(!name) return; setLists(p => ({ ...p, [current.id]: { ...current, name } })); };
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
    const order = ["All", ...CAT_ORDER_DEFAULT];
    const out = [];
    (Array.isArray(catOrder)?catOrder:CAT_ORDER_DEFAULT).forEach(c => { if (byCat.has(c)) out.push([c, byCat.get(c)]) });
    for (const [k, arr] of byCat) { if(!order.includes(k)) out.push([k, arr]); }
    return out;
  }, [filtered, catOrder]);

  const count = useMemo(()=>{
    const totalItems = rawItems.length;
    const done = rawItems.filter(i=>i.bought).length;
    return { totalItems, done, left: totalItems - done };
  }, [rawItems]);

  const total = useMemo(() =>
    rawItems.reduce((sum,i)=>sum + ((Number(i.price)||0) * (Number(i.qty)||1)), 0), [rawItems]);

  // Price lookups
  async function findPrice(id){
    const item = (current.items||[]).find(i=>i.id===id);
    if(!item) return;
    try{
      const q = encodeURIComponent(item.text);
      const c = encodeURIComponent(item.category||'Other');
      const resp = await fetch(`/api/smart-find?name=${q}&category=${c}`);
      const data = await resp.json();
      if(!data.ok){ setField(id,'priceStatus','error'); setField(id,'lastChecked',nowIso()); alert(data.error||'Search failed'); return; }
      if(!data.results || !data.results.length){ setField(id,'priceStatus','miss'); setField(id,'lastChecked',nowIso()); return; }
      const best = data.results[0];
      updateCurrent(list => list.map(i=>i.id===id?{...i, price:String(best.price), productUrl:best.source, priceStatus:'ok', lastChecked:nowIso()}:i));
      setTimeout(()=>{ const el=document.getElementById(`it-${id}`); if(el){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1100); }},0);
    }catch(e){ setField(id,'priceStatus','error'); setField(id,'lastChecked',nowIso()); }
  }
  async function batchPriceCheck(ids){
    setChecking(true); setCheckMsg(`Checking 0 / ${ids.length}…`);
    const summary = { updated:0, notFound:0, failed:0 };
    for (let i=0;i<ids.length;i++){
      setCheckMsg(`Checking ${i+1} / ${ids.length}…`);
      await findPrice(ids[i]);
      const it = (lists[current.id]?.items||[]).find(x=>x.id===ids[i]);
      if (it?.priceStatus==='ok') summary.updated++;
      else if (it?.priceStatus==='miss') summary.notFound++;
      else if (it?.priceStatus==='error') summary.failed++;
      await new Promise(r=>setTimeout(r, 1600));
    }
    setChecking(false); setCheckMsg(''); setCheckSummary({...summary, at:new Date().toISOString()});
    alert(`Prices updated: ${summary.updated} ✓, ${summary.notFound} not found, ${summary.failed} errors`);
  }

  // Action sheet helpers
  function openAdd(){ openSheet('add'); }
  function openItemActions(id){ openSheet({type:'item', id}); }

  // --------------------------------------------------------------------------
  return (
    <div className={tripMode ? "trip" : ""}>
      <h1>Shopping</h1>

      {/* Header / toolbar */}
      <div className="card">
        <div className="toolbar compact">
          <select className="select" value={current.id} onChange={e=>setCurrentId(e.target.value)}>
            {Object.values(lists).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="icons">
            <button className="icon-btn" title="New list" onClick={createList}>＋</button>
            <button className="icon-btn" title="Rename" onClick={renameList}>✎</button>
            <button className="icon-btn" title="Delete" onClick={deleteList}>🗑</button>
          </div>

          <div style={{gridColumn:"1 / -1", display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <button className="button ghost" onClick={()=>setBulkOpen(v=>!v)}>{bulkOpen ? "Cancel paste" : "Paste"}</button>
            <button className="button ghost" onClick={()=>setHideChecked(v=>!v)}>{hideChecked ? "Show checked" : "Hide checked"}</button>
            <button className="button ghost" onClick={()=>setTripMode(v=>!v)}>{tripMode ? "Exit Trip" : "Trip mode"}</button>
            <button className="button ghost" onClick={()=>setShowPrices(v=>!v)}>{showPrices ? "Hide prices" : "Show prices"}</button>
            <button className="button ghost" onClick={()=>{
              const visible = (hideChecked ? (current.items||[]).filter(i=>!i.bought) : (current.items||[]));
              const toCheck = visible.filter(i=>!i.price).map(i=>i.id);
              if(!toCheck.length) { alert('No visible items without price.'); return; }
              batchPriceCheck(toCheck);
            }}>Check prices</button>
            <button className="button secondary" onClick={clearChecked}>Clear</button>
            <span style={{marginLeft:'auto'}} className="count-badge">Total {count.totalItems} • Left {count.left}</span>
          </div>

          <input className="input" style={{gridColumn:"1 / -1"}} placeholder="Filter items…" value={filterText} onChange={e=>setFilterText(e.target.value)} />

          <div className="seg scroller-x" style={{gridColumn:"1 / -1"}}>
            {["All", ...CAT_ORDER_DEFAULT].map(c => (
              <button key={c} className={`segbtn ${filterCat===c ? 'active' : ''}`} onClick={()=>setFilterCat(c)}>{c}</button>
            ))}
          </div>

          <div className="scroller-x" style={{gridColumn:"1 / -1"}}>
            {QUICK_ADD.map(q=>(
              <div key={q.t} className="chip" onClick={()=>addItem(q.t, { qty:1, unit:q.u, cat:q.c })}><span className="dot" /> {q.t}</div>
            ))}
          </div>

          {bulkOpen && (
            <div style={{gridColumn:"1 / -1"}}>
              <textarea className="input" rows={5} placeholder={"Paste items, one per line"} value={bulkText} onChange={e=>setBulkText(e.target.value)} />
              <div className="space" />
              <button className="button" onClick={bulkAdd}>Add lines</button>
            </div>
          )}
        </div>
      </div>

      {/* progress banner */}
      {checking && (
        <div className="card">
          <div className="progress"><span className="spinner"/> <strong>Price check in progress…</strong><span className="muted"> {checkMsg}</span></div>
        </div>
      )}

      {/* List groups */}
      <div className="card">
        {groups.length === 0 && <p className="muted">No items yet. Tap “＋” to add milk, eggs, nappies…</p>}
        {groups.map(([category, arr])=>{
          const checkedCount = arr.filter(i=>i.bought).length;
          return (
            <section key={category}>
              <div className="cat-header sticky">
                <strong>{category}</strong>
                <div className="item-actions">
                  <span className="count-badge">{arr.length} items{checkedCount ? ` – ${checkedCount} done` : ""}</span>
                </div>
              </div>

              <ul className="list">
                {arr.map(item => (
                  <li key={item.id} id={`it-${item.id}`} className="list-item item-row">
                    <label className="checkbox-line">
                      <input type="checkbox" checked={!!item.bought} onChange={()=>toggle(item.id)} />
                    </label>

                    <div className="item-name" style={{textDecoration: item.bought ? 'line-through' : 'none'}}>
                      {item.text}{item.qty>1?` × ${item.qty}`:""}{item.unit && item.unit!=="x" ? ` (${item.unit})` : ""}
                      {item.price ? <span className="badge-euro">€ {Number(item.price||0).toFixed(2)}</span> : null}
                    </div>

                    <div className="qty-step">
                      <button className="button secondary" onClick={()=>setField(item.id, "qty", Math.max(1,(item.qty||1)-1))}>−</button>
                      <button className="button secondary" onClick={()=>setField(item.id, "qty", (item.qty||1)+1)}>＋</button>
                    </div>

                    <button className="icon-btn ghost" aria-label="More" onClick={()=>openItemActions(item.id)}>⋯</button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Summary / totals */}
      {checkSummary && (
        <div className="card">
          <h3>Last Price Check</h3>
          <p className="muted small">{new Date(checkSummary.at).toLocaleString()}</p>
          <div className="kpi">
            <div><strong>Updated</strong><div className="space"/> {checkSummary.updated}</div>
            <div><strong>Not found</strong><div className="space"/> {checkSummary.notFound}</div>
            <div><strong>Failed</strong><div className="space"/> {checkSummary.failed}</div>
          </div>
        </div>
      )}
      {showPrices && (
        <div className="card">
          <div className="pill green">Total (priced items): € {total.toFixed(2)}</div>
          <p className="muted small">Prices are optional and stored locally on this device only.</p>
        </div>
      )}

      {/* FAB */}
      {isPhone && <button className="fab" onClick={openAdd} title="Add item">+</button>}

      {/* Bottom sheet */}
      <dialog ref={sheetRef} className="sheet" onClose={closeSheet}>
        <div className="panel">
          <div className="grab" />
          {sheetType==='add' && (
            <>
              <h3>Add item</h3>
              <div className="space" />
              <div className="row">
                <input className="input" placeholder="Item name…" value={text} onChange={e=>setText(e.target.value)}
                       onKeyDown={e=>{ if(e.key==='Enter'){ addItem(); closeSheet(); }}} />
                <input className="input sm" type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value)||1)} />
                <select className="select sm" value={unit} onChange={e=>setUnit(e.target.value)}>{UNITS.map(u=> <option key={u} value={u}>{u}</option>)}</select>
                <select className="select sm" value={cat} onChange={e=>setCat(e.target.value)}>{CAT_ORDER_DEFAULT.map(c=> <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div className="chips scroller-x" style={{marginTop:10}}>
                {QUICK_ADD.map(q=>(
                  <div key={q.t} className="chip" onClick={()=>{ addItem(q.t,{qty:1,unit:q.u,cat:q.c}); }}>
                    <span className="dot" /> {q.t}
                  </div>
                ))}
              </div>
              <div className="space" />
              <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button className="button secondary" onClick={closeSheet}>Cancel</button>
                <button className="button" onClick={()=>{ addItem(); closeSheet(); }}>Add</button>
              </div>
            </>
          )}

          {sheetType && sheetType.type==='item' && (()=> {
            const it = (current.items||[]).find(i=>i.id===sheetType.id);
            if(!it) return <p className="muted">Item not found.</p>;
            return (
              <>
                <h3>{it.text}</h3>
                <div className="space" />
                <div className="row">
                  <input className="input sm" type="number" step="0.01" placeholder="€"
                         value={it.price} onChange={e=>setField(it.id,'price',e.target.value)} />
                  <button className="button secondary" onClick={()=>findPrice(it.id)}>Find price</button>
                  <button className="button secondary" onClick={()=>pin(it.id)}>{it.pinned ? "Unpin" : "Pin"}</button>
                  <button className="button secondary" style={{color:'#ef4444'}} onClick={()=>{ remove(it.id); closeSheet(); }}>Delete</button>
                </div>
                {it.priceStatus && (
                  <p className="muted small">Last check: {new Date(it.lastChecked||Date.now()).toLocaleString()} — {it.priceStatus}</p>
                )}
                <div className="space" />
                <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
                  <button className="button secondary" onClick={closeSheet}>Close</button>
                </div>
              </>
            );
          })()}
        </div>
      </dialog>
    </div>
  );
}
