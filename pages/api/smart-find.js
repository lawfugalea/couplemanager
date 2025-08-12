export const config = { runtime: "nodejs" };
import axios from "axios";
import { load } from "cheerio";

/**
 * GET /api/smart-find?name=Milk&category=Dairy
 * Returns: { ok, results: [ {name, price, source}... ] }
 *
 * Notes:
 * - We only fetch public pages on smart.com.mt (category/search pages).
 * - Heuristics: find elements containing "€" and derive a nearby name.
 * - We score by token overlap with your query, return best few matches.
 */
const BASE = "https://www.smart.com.mt";
const CATEGORY_URLS = {
  Produce:   [`${BASE}/forms/Products.aspx?=10-20`],              // Food Cupboard (broad, still useful)
  Dairy:     [`${BASE}/forms/Products.aspx?=10-25-2520`],         // Dairy, Eggs & Cheese
  Bakery:    [`${BASE}/forms/Products.aspx?=10-10-1015`],         // Bread (common bakery subcat)
  Drinks:    [`${BASE}/forms/Products.aspx?=10-15`, `${BASE}/forms/Products.aspx?=10-15-1535`], // Drinks + Tea
  Pantry:    [`${BASE}/forms/Products.aspx?=10-20`],              // Pantry/food cupboard
  Frozen:    [`${BASE}/forms/Products.aspx?=10-30`],              // Guess; may not always exist
  Household: [`${BASE}/forms/Products.aspx?=10-45-4540`],         // Laundry subcat
  Baby:      [`${BASE}/forms/Products.aspx?=10-55-5525`],         // Baby subcat
  Pharmacy:  [`${BASE}/forms/Products.aspx?=10-35`],              // Health & Beauty top
  Other:     [`${BASE}/forms/SearchResults.aspx`],                // Generic search page (fallback)
};

function norm(s){ return (s||"").toLowerCase().replace(/\s+/g," ").trim(); }
function tokens(s){ return norm(s).split(/[^a-z0-9%]+/).filter(Boolean); }

// quick&clean token overlap score
function score(query, candidate){
  const q = new Set(tokens(query));
  const c = new Set(tokens(candidate));
  if(!q.size || !c.size) return 0;
  let hit = 0;
  for(const t of q){ if(c.has(t)) hit++; }
  return hit / Math.max(q.size, c.size);
}

function extractCandidates(html){
  const $ = load(html);
  const out = [];
  // look for any element that contains a € price; derive its name from nearby text
  $("body *:contains('€')").each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, " ").trim();
    const euros = [...text.matchAll(/€\s?(\d+(?:[.,]\d{1,2})?)/g)];
    if (!euros.length) return;
    const price = parseFloat(euros[euros.length-1][1].replace(",", "."));
    if (!Number.isFinite(price)) return;

    // try to find a title-like child/sibling
    let name =
      $el.find("h1,h2,h3,.name,.desc,strong").first().text().trim() ||
      $el.closest("*").find("h1,h2,h3,.name,.desc,strong").first().text().trim();

    if (!name) {
      // fallback: strip price tail from the element text
      name = text.replace(/€.*$/, "").trim();
      // clamp
      if (name.length > 120) name = name.slice(0,120);
    }
    if (name) out.push({ name, price });
  });
  // de-dupe by name+price
  const uniq = new Map();
  for(const it of out){
    const key = norm(it.name)+"|"+it.price;
    if (!uniq.has(key)) uniq.set(key, it);
  }
  return [...uniq.values()];
}

export default async function handler(req, res) {
  try {
    const name = (req.query.name || "").toString().trim();
    const category = (req.query.category || "Other").toString().trim();
    if (!name) return res.status(400).json({ ok:false, error:"Missing name" });

    const pools = CATEGORY_URLS[category] || CATEGORY_URLS.Other;
    const results = [];

    for (const url of pools) {
      try {
        const { data: html } = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CoupleApp/1.0; +https://example.invalid)",
            "Accept-Language": "en-GB,en;q=0.9"
          },
          timeout: 10000
        });
        const cands = extractCandidates(html)
          .map(c => ({ ...c, source: url, _score: score(name, c.name) }))
          .filter(c => c._score > 0); // only keep matching-ish
        results.push(...cands);
      } catch (e) {
        // ignore pool errors; move on
      }
    }

    if (!results.length) {
      return res.json({ ok:true, results: [] });
    }

    // sort by score desc then lowest price first (tie-breaker)
    results.sort((a,b)=> (b._score - a._score) || (a.price - b.price));
    // top few
    const top = results.slice(0, 5).map(({name,price,source})=>({name,price,source}));

    return res.json({ ok:true, results: top });
  } catch (err) {
    console.error("smart-find error:", err.message);
    return res.status(500).json({ ok:false, error:"Search failed" });
  }
}