import { useMemo, useState } from "react";
import useLocalStorage from "@/utils/useLocalStorage";

const CAT_ORDER_DEFAULT = ["Produce","Dairy","Bakery","Pantry","Frozen","Baby","Household","Pharmacy","Other"];
const UNITS = ["x","kg","g","L","ml","pack"];

const QUICK_ADD = [
  { t:"Milk", c:"Dairy", u:"L" }, { t:"Bread", c:"Bakery", u:"x" }, { t:"Eggs", c:"Dairy", u:"x" },
  { t:"Bananas", c:"Produce", u:"x" }, { t:"Apples", c:"Produce", u:"x" }, { t:"Chicken", c:"Pantry", u:"kg" },
  { t:"Pasta", c:"Pantry", u:"x" }, { t:"Nappies", c:"Baby", u:"pack" }, { t:"Wipes", c:"Baby", u:"pack" },
  { t:"Detergent", c:"Household", u:"x" }
];

const DEFAULT_LISTS = {
  weekly:   { id:"weekly",   name:"Weekly Shop", items:[] },
  pharmacy: { id:"pharmacy", name:"Pharmacy",    items:[] },
  house:    { id:"house",    name:"Household",   items:[] }
};

export default function Shopping() {
  // Lists + current
  const [lists, setLists] = useLocalStorage("shopping-lists", DEFAULT_LISTS);
  const [currentId, setCurrentId] = useLocalStorage("shopping-current", "weekly");
  const current = lists[currentId] || Object.values(lists)[0];

  // UI toggles
  const [hideChecked, setHideChecked] = useLocalStorage("shopping-hide-checked", false);
  const [tripMode, setTripMode]       = useLocalStorage("shopping-trip-mode", false);
  const [showPrices, setShowPrices]   = useLocalStorage("shopping-show-prices", false);

  // Categories state
  const [catOrder] = useLocalStorage("shopping-cats-order", CAT_ORDER_DEFAULT);
  const [collapsed, setCollapsed] = useLocalStorage(
    "shopping-cats-collapsed",
    Object.fromEntries(CAT_ORDER_DEFAULT.map(c=>[c,false]))
  );

  // Add form
  const [text, setText] = useState("");
  const [qty, setQty]   = useState(1);
  const [unit, setUnit] = useState("x");
  const [cat, setCat]   = useState("Produce");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Price-check progress + summary
  const [checking, setChecking]         = useState(false);
  const [checkMsg, setCheckMsg]         = useState("");
  const [checkSummary, setCheckSummary] = useLocalStorage("shopping-price-summary", null);

  function nowIso(){ return new Date().toISOString(); }

  const updateCurrent = (updater) => {
    setLists(prev => ({ ...prev, [current.id]: { ...current, items: updater(current.items || []) }}));
  };

  function normalize(s){ return s.trim().toLowerCase(); }

  const addItem = (rawText, opt={qty, unit, cat}) => {
    const t = (rawText ?? text).trim();
    if(!t) return;

    const nText = normalize(t);
    updateCurrent(items => {
      // de-dupe: same name & same unit & same category
      const foundIndex = items.findIndex(i => normalize(i.text)===nText && i.unit===opt.unit && i.category===opt.cat);
      if (foundIndex >= 0) {
        const copy = [...items];
        copy[foundIndex] = { ...copy[foundIndex], qty: (copy[foundIndex].qty || 1) + (opt.qty || 1) };
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

  // Bulk paste: one item per line
  const bulkAdd = () => {
    const lines = bulkText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    lines.forEach(line => addItem(line, { qty:1, unit:"x", cat:"Other" }));
    setBulkText(""); setBulkOpen(false);
  };

  // Lists CRUD
  const createList = () => {
    const name = prompt("New list name:");
    if(!name) return;
    const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || "list";
    const id = (lists[idBase] ? `${idBase}-${Date.now()}` : idBase);
    setLists(p => ({ ...p, [id]: { id, name, items:[] } }));
    setCurrentId(id);
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
    const nextId = ids[0];
    const copy = { ...lists }; delete copy[current.id];
    setLists(copy); setCurrentId(nextId);
  };

  // Quick-add chips
  const quickAdd = (item) => addItem(item.t, { qty:1, unit:item.u, cat:item.c });

  // Derive groups & totals
  const items = current.items || [];
  const filtered = hideChecked ? items.filter(i => !i.bought) : items;

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
    const ordered = [];
    const order = Array.isArray(catOrder) ? catOrder : CAT_ORDER_DEFAULT;
    order.forEach(c => { if (byCat.has(c)) ordered.push([c, byCat.get(c)]) });
    for (const [k, arr] of byCat) { if(!order.includes(k)) ordered.push([k, arr]); }
    return ordered;
  }, [filtered, catOrder]);

  const total = useMemo(() =>
    items.reduce((sum,i)=>sum + ((Number(i.price)||0) * (Number(i.qty)||1)), 0), [items]);

  const listCounts = useMemo(()=>{
    const totalItems = items.length;
    const done = items.filter(i=>i.bought).length;
    return { totalItems, done, left: totalItems - done };
  }, [items]);

  // ---- Price lookups --------------------------------------------------------
  async function findPrice(id){
    const item = (current.items||[]).find(i=>i.id===id);
    if(!item) return;
    try{
      const q = encodeURIComponent(item.text);
      const c = encodeURIComponent(item.category||'Other');
      const resp = await fetch(`/api/smart-find?name=${q}&category=${c}`);
      const data = await resp.json();
      if(!data.ok){
        updateCurrent(list => list.map(i=>i.id===id?{...i, priceStatus:'error', lastChecked:nowIso()}:i));
        alert(data.error || 'Search failed');
        return;
      }
      if(!data.results || !data.results.length){
        updateCurrent(list => list.map(i=>i.id===id?{...i, priceStatus:'miss', lastChecked:nowIso()}:i));
        return;
      }
      const best = data.results[0];
      updateCurrent(list => list.map(i=>i.id===id?{
        ...i, price:String(best.price), productUrl:best.source, priceStatus:'ok', lastChecked:nowIso()
      }:i));
      // flash the row
      setTimeout(()=> {
        const el = document.getElementById(`it-${id}`);
        if (el) { el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'), 1100); }
      }, 0);
    }catch(e){
      updateCurrent(list => list.map(i=>i.id===id?{...i, priceStatus:'error', lastChecked:nowIso()}:i));
    }
  }

  async function batchPriceCheck(ids){
    setChecking(true);
    setCheckMsg(`Checking 0 / ${ids.length}…`);
    const summary = { updated:0, notFound:0, failed:0 };
    for (let i=0;i<ids.length;i++){
      setCheckMsg(`Checking ${i+1} / ${ids.length}…`);
      await findPrice(ids[i]);
      const it = (lists[current.id]?.items||[]).find(x=>x.id===ids[i]);
      if (it?.priceStatus==='ok') summary.updated++;
      else if (it?.priceStatus==='miss') summary.notFound++;
      else if (it?.priceStatus==='error') summary.failed++;
      await new Promise(r=>setTimeout(r, 1600)); // polite rate
    }
    setChecking(false);
    setCheckMsg('');
    setCheckSummary({...summary, at: new Date().toISOString()});
    alert(`Prices updated: ${summary.updated} ✓, ${summary.notFound} not found, ${summary.failed} errors`);
  }

  // --------------------------------------------------------------------------

  return (
    <div className={tripMode ? "trip" : ""}>
      <h1>Shopping</h1>

      <div className="card">
        <div className="toolbar">
          <select className="select" value={current.id} onChange={e=>setCurrentId(e.target.value)}>
            {Object.values(lists).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button className="button secondary" onClick={createList}>New list</button>
          <button className="button secondary" onClick={renameList}>Rename</button>
          <button className="button secondary" onClick={deleteList}>Delete</button>

          <span style={{flex:1}} />

          <button className="button ghost" onClick={()=>setBulkOpen(v=>!v)}>{bulkOpen ? "Cancel paste" : "Paste items"}</button>
          <button className="button ghost" onClick={()=>setHideChecked(v=>!v)}>{hideChecked ? "Show checked" : "Hide checked"}</button>
          <button className="button ghost" onClick={()=>setTripMode(v=>!v)}>{tripMode ? "Exit Trip mode" : "Trip mode"}</button>
          <button className="button ghost" onClick={()=>setShowPrices(v=>!v)}>{showPrices ? "Hide prices" : "Show prices"}</button>
          <button className="button ghost" onClick={()=>{
            const visible = (hideChecked ? (current.items||[]).filter(i=>!i.bought) : (current.items||[]));
            const toCheck = visible.filter(i=>!i.price).map(i=>i.id);
            if(!toCheck.length) { alert('No visible items without price.'); return; }
            batchPriceCheck(toCheck);
          }}>Check prices (slow)</button>
          <button className="button secondary" onClick={clearChecked}>Clear checked</button>
          <span className="count-badge">Total {listCounts.totalItems} • Left {listCounts.left} • Done {listCounts.done}</span>
        </div>

        {/* Add bar */}
        <div className="inputbar" style={{marginTop:10, display:'grid', gridTemplateColumns:'2fr 80px 110px 180px 120px', gap:8}}>
          <input className="input" placeholder="Add an item… (Enter to add)"
                 value={text} onChange={e=>setText(e.target.value)}
                 onKeyDown={e=>{ if(e.key==='Enter'){ addItem(); }}} />
          <input className="input sm" type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value)||1)} />
          <select className="select sm" value={unit} onChange={e=>setUnit(e.target.value)}>
            {UNITS.map(u=> <option key={u} value={u}>{u}</option>)}
          </select>
          <select className="select sm" value={cat} onChange={e=>setCat(e.target.value)}>
            {CAT_ORDER_DEFAULT.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="button" onClick={()=>addItem()}>Add</button>
        </div>

        {/* Quick-add chips */}
        <div className="chips" style={{marginTop:10}}>
          {QUICK_ADD.map(q=>(
            <div key={q.t} className="chip" onClick={()=>quickAdd(q)}>
              <span className="dot" /> {q.t}
            </div>
          ))}
        </div>

        {/* Bulk paste box */}
        {bulkOpen && (
          <div style={{marginTop:10}}>
            <textarea className="input" rows={5} placeholder={"Paste items, one per line"} value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            <div className="space" />
            <button className="button" onClick={bulkAdd}>Add lines</button>
          </div>
        )}
      </div>

      {/* progress banner */}
      {checking && (
        <div className="card">
          <div className="progress"><span className="spinner"/> <strong>Price check in progress…</strong><span className="muted"> {checkMsg}</span></div>
        </div>
      )}

      {/* Grouped list by category */}
      <div className="card">
        {groups.length === 0 && <p className="muted">No items yet. Add milk, eggs, nappies…</p>}

        {groups.map(([category, arr])=>{
          const checkedCount = arr.filter(i=>i.bought).length;
          return (
            <section key={category}>
              <div className="cat-header">
                <strong>{category}</strong>
                <div className="item-actions">
                  <span className="count-badge">{arr.length} items{checkedCount ? ` – ${checkedCount} done` : ""}</span>
                  <button className="button ghost" onClick={()=>setCollapsed(p=>({ ...p, [category]: !p[category] }))}>
                    {collapsed[category] ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>

              {!collapsed[category] && (
                <ul className="list">
                  {arr.map(item => (
                    <li key={item.id} id={`it-${item.id}`} className="list-item">
                      <label className="checkbox-line" style={{flex:1, minWidth:0}}>
                        <input type="checkbox" checked={!!item.bought} onChange={()=>toggle(item.id)} />
                        <div className="item-name" style={{textDecoration: item.bought ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {item.qty > 1 ? `${item.qty} × ` : ""}{item.text}{item.unit && item.unit!=="x" ? ` (${item.unit})` : ""} {item.price ? <span className="badge-euro">€ {Number(item.price||0).toFixed(2)}</span> : null}
                        </div>
                      </label>

                      <div className="item-actions">
                        <button className="button secondary" onClick={()=>setField(item.id, "qty", Math.max(1,(item.qty||1)-1))}>−</button>
                        <button className="button secondary" onClick={()=>setField(item.id, "qty", (item.qty||1)+1)}>＋</button>
                      </div>

                      {showPrices && (
                        <>
                          <input className="input sm" style={{width:110}} type="number" step="0.01" placeholder="€"
                                 value={item.price} onChange={e=>setField(item.id, "price", e.target.value)} />
                          <button className="button secondary" title="Find price on Smart" onClick={()=>findPrice(item.id)}>Find</button>
                          {item.priceStatus && (
                            <span className={`pill status ${item.priceStatus}`} title={item.lastChecked?`Checked ${new Date(item.lastChecked).toLocaleString()}`:''}>
                              {item.priceStatus==='ok' ? '€ found' : item.priceStatus==='miss' ? 'no price found' : 'error'}
                            </span>
                          )}
                        </>
                      )}

                      <button className="button secondary" title={item.pinned ? "Unpin" : "Pin"} onClick={()=>pin(item.id)}>
                        {item.pinned ? "★" : "☆"}
                      </button>
                      <button className="button secondary" onClick={()=>remove(item.id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* summary card */}
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

      {/* Totals (only if prices visible) */}
      {showPrices && (
        <div className="card">
          <div className="pill green">Total (priced items): € {total.toFixed(2)}</div>
          <p className="muted small">Prices are optional and stored locally on this device only.</p>
        </div>
      )}
    </div>
  );
}
