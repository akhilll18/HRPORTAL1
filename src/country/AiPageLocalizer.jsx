// "Translate page" — generative AI applied to every string on screen. It walks every text node in the page
// (headings, labels, table cells, buttons, chips, messages), sends the unique strings to the model in batches,
// and swaps the translations in place. New text that React renders later is translated as it appears.
// Inputs, the AI panels and code are left alone; "Original" restores the page. Translations are cached per session.
import React, { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Divider, ListSubheader, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { TranslateRounded, CheckRounded } from "@mui/icons-material";
import { aiGenerate } from "../lib/ai/client.js";
import { resolveProvider } from "../lib/ai/config.js";
import { useStore } from "../store/AppStore.jsx";
import { useCountry } from "./CountryContext.jsx";
import { ONAS } from "./brand.js";

const COMMON = ["Hindi", "Arabic", "French", "Portuguese", "Swahili", "Afrikaans", "Spanish", "German", "Mandarin Chinese"];
const SKIP = "[data-ai-ui],script,style,textarea,input,select,code,pre,[contenteditable='true'],.MuiInputBase-root,[data-no-translate]";
const original = new WeakMap();   // text node → original string
const cache = {};                 // language → { original: translation }

function loadCache(lang) {
  if (cache[lang]) return cache[lang];
  try {
    cache[lang] = JSON.parse(sessionStorage.getItem(`onas-i18n-${lang}`) || "{}");
  } catch {
    cache[lang] = {};
  }
  return cache[lang];
}
function saveCache(lang) {
  try {
    sessionStorage.setItem(`onas-i18n-${lang}`, JSON.stringify(cache[lang]));
  } catch {
    /* quota */
  }
}

function textNodes(root) {
  const out = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = n.nodeValue;
      if (!t || t.trim().length < 2 || !/\p{L}/u.test(t)) return NodeFilter.FILTER_REJECT;
      if (/^[A-Z0-9$€£₹₦.,:/\-\s]{1,4}$/.test(t.trim())) return NodeFilter.FILTER_REJECT; // initials, short codes
      if (n.parentElement?.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (w.nextNode()) out.push(w.currentNode);
  return out;
}

async function translateBatch(strings, lang, signal) {
  const system =
    `You translate the user interface of an HR portal into ${lang}. You get a JSON array of UI strings. ` +
    `Translate each one naturally and briefly, as a local HR product would. Keep unchanged: numbers, amounts, currency symbols and codes ` +
    `(N$, ₹, R, KES…), dates, employee codes (EMP001), people's names, acronyms such as PAYE, SSC, UIF, NSSF, PF, TDS, and anything that is already in ${lang}. ` +
    `Return ONLY a JSON array of strings with exactly the same length and order. No commentary.`;
  const out = await aiGenerate({ task: "translate-ui", system, messages: [{ role: "user", content: JSON.stringify(strings) }], fast: true, maxTokens: 4000, signal, temperature: 0 });
  const a = out.indexOf("["), b = out.lastIndexOf("]");
  const arr = JSON.parse(out.slice(a, b + 1));
  if (!Array.isArray(arr) || arr.length !== strings.length) throw new Error("The AI returned a different number of strings.");
  return arr;
}

export default function AiPageLocalizer() {
  const { notifyToast } = useStore();
  const { pack } = useCountry();
  const [anchor, setAnchor] = useState(null);
  const [lang, setLang] = useState(null);
  const [busy, setBusy] = useState(false);
  const ctl = useRef(null);
  const obs = useRef(null);
  const queued = useRef(new Set());
  const timer = useRef(null);

  // The whole app (sidebar, header and page); AI panels, inputs and code are skipped.
  const root = () => document.getElementById("root") || document.querySelector("[data-ai-page]");

  function apply(l, nodes) {
    const dict = loadCache(l);
    const missing = new Set();
    for (const n of nodes) {
      const cur = n.nodeValue;
      const known = original.get(n);
      // React may have replaced the text since we translated it: treat the new value as the new original.
      const src = known !== undefined && dict[known.trim()] === cur.trim() ? known : cur;
      original.set(n, src);
      const key = src.trim();
      if (dict[key]) {
        const next = src.replace(key, dict[key]);
        if (n.nodeValue !== next) n.nodeValue = next;
      } else missing.add(key);
    }
    return [...missing];
  }

  async function fill(l, strings) {
    const dict = loadCache(l);
    const todo = strings.filter((s) => !dict[s]);
    for (let i = 0; i < todo.length; i += 60) {
      const part = todo.slice(i, i + 60);
      const res = await translateBatch(part, l, ctl.current?.signal);
      part.forEach((s, k) => (dict[s] = String(res[k] ?? s)));
      saveCache(l);
      const r = root();
      if (r) apply(l, textNodes(r));
    }
  }

  function restore() {
    obs.current?.disconnect();
    const r = root();
    if (r) for (const n of textNodes(r)) { const o = original.get(n); if (o !== undefined) n.nodeValue = o; }
    root()?.removeAttribute("lang");
  }

  async function start(l) {
    setAnchor(null);
    ctl.current?.abort();
    restore();
    if (!l) return setLang(null);
    const { provider } = await resolveProvider();
    if (provider === "mock") {
      notifyToast("Page translation needs a live Claude connection. Super Admin → System settings → Generative AI.", "info");
      return;
    }
    setLang(l);
    ctl.current = new AbortController();
    setBusy(true);
    try {
      const r = root();
      if (!r) return;
      r.setAttribute("lang", l);
      const missing = apply(l, textNodes(r));
      await fill(l, missing);
      watch(l);
    } catch (e) {
      if (e.name !== "AbortError") notifyToast(`Translation stopped: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  // Keep translating as React re-renders or the user moves to another page.
  function watch(l) {
    obs.current?.disconnect();
    const target = root() || document.body;
    obs.current = new MutationObserver(() => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const r = root();
        if (!r) return;
        obs.current.disconnect();
        const missing = apply(l, textNodes(r)).filter((s) => !queued.current.has(s));
        missing.forEach((s) => queued.current.add(s));
        obs.current.observe(target, { subtree: true, childList: true, characterData: true });
        if (missing.length) {
          try {
            await fill(l, missing);
          } catch {
            /* keep the page usable if a batch fails */
          } finally {
            missing.forEach((s) => queued.current.delete(s));
          }
        }
      }, 350);
    });
    obs.current.observe(target, { subtree: true, childList: true, characterData: true });
  }

  useEffect(() => () => { ctl.current?.abort(); obs.current?.disconnect(); }, []);

  const local = pack?.languages || [];
  return (
    <>
      <Tooltip title={lang ? `Page translated to ${lang} by AI — click to change` : "Translate every word on this page with AI"}>
        <Box data-ai-ui role="button" aria-label="Translate page with AI" onClick={(e) => setAnchor(e.currentTarget)} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.6, height: 34, px: 1.1, borderRadius: 99, border: `1px solid ${ONAS.line}`, cursor: "pointer", background: lang ? ONAS.mintSoft : "#fff", color: ONAS.navy, "&:hover": { borderColor: ONAS.teal } }}>
          {busy ? <CircularProgress size={14} sx={{ color: ONAS.teal }} /> : <TranslateRounded sx={{ fontSize: 16 }} />}
          <Typography sx={{ fontSize: "0.65rem", fontWeight: 700 }}>{lang || "Translate"}</Typography>
        </Box>
      </Tooltip>
      <Menu data-ai-ui anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 230, maxHeight: 420 } } }}>
        <MenuItem selected={!lang} onClick={() => start(null)} sx={{ fontSize: "0.72rem" }}>Original (English) {!lang && <CheckRounded sx={{ fontSize: 15, ml: "auto" }} />}</MenuItem>
        <Divider />
        {local.length > 0 && <ListSubheader sx={{ fontSize: "0.55rem", fontWeight: 800, lineHeight: "26px" }}>{pack.name.toUpperCase()} LANGUAGES</ListSubheader>}
        {local.map((l) => <MenuItem key={l} selected={lang === l} onClick={() => start(l)} sx={{ fontSize: "0.72rem" }}>{l}</MenuItem>)}
        <ListSubheader sx={{ fontSize: "0.55rem", fontWeight: 800, lineHeight: "26px" }}>MORE LANGUAGES</ListSubheader>
        {COMMON.filter((l) => !local.includes(l)).map((l) => <MenuItem key={l} selected={lang === l} onClick={() => start(l)} sx={{ fontSize: "0.72rem" }}>{l}</MenuItem>)}
      </Menu>
    </>
  );
}
