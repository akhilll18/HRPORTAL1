// ONAS brand re-skin, applied at build time so the existing source files keep their original colours.
// Every colour in src/**/*.{js,jsx,css} is mapped from the old PeopleHub forest-green palette to the ONAS logo palette
// (navy-teal #124554 + mint #3EE8B0):
//   • key brand colours are mapped exactly (EXACT below);
//   • other greens become ONAS navy-teal; bright greens become ONAS mint; green "success" tones stay green-mint;
//   • green-tinted greys become the slate-teal greys used in the logo.
// Turn it off with  ONAS_BRAND=off npm run dev  to see the original PeopleHub colours.

const EXACT = {
  "#27614e": "#124554", // primary
  "#1e493a": "#0b2f3a", // primary dark / sidebar
  "#2e8c7a": "#1a8c8c", // teal accent
  "#9fe3c9": "#7eeac6", // mint
  "#b7edd8": "#a6f2d8",
  "#25a582": "#16b38f",
  "#0f2e25": "#082630", // glass "forest" → ONAS ink
  "#12352b": "#0d3442",
  "#0b231c": "#051c24",
  "#e8f2ec": "#e4f3f2", // primary light
  "#eaf2ed": "#e4f3f2",
  "#eaf2ec": "#e4f3f2",
  "#c77b1c": "#3ee8b0", // AI gradient end (saffron) → ONAS mint
};

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
}
const toHex = ([r, g, b]) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");

export function onasColor(hex) {
  const key = hex.toLowerCase();
  if (EXACT[key]) return EXACT[key];
  const [h, s, l] = hexToHsl(key);
  if (h < 80 || h > 175 || s < 0.03 || l > 0.985 || l < 0.02) return hex; // not green: keep
  if (s < 0.2) return toHex(hslToRgb(195, Math.min(0.28, s * 1.6 + 0.04), l)); // green-grey → slate-teal grey
  if (h >= 100 && h <= 145) return toHex(hslToRgb(154, s, l)); // success greens → mint green
  if (l > 0.55 && s > 0.45) return toHex(hslToRgb(160, Math.max(s, 0.7), l)); // bright mint
  return toHex(hslToRgb(192, Math.min(1, s * 1.05), l)); // brand greens → ONAS navy-teal
}

function recolor(code) {
  return code
    .replace(/#[0-9a-fA-F]{6}\b/g, (m) => onasColor(m))
    .replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
      const hex = toHex([+r, +g, +b]);
      const n = onasColor(hex);
      if (n === hex) return m;
      const [R, G, B] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
      return a ? `rgba(${R},${G},${B}${a})` : `rgb(${R},${G},${B})`;
    });
}

export default function onasBrand() {
  const off = process.env.ONAS_BRAND === "off";
  return {
    name: "onas-brand",
    enforce: "pre",
    transform(code, id) {
      if (off) return null;
      const file = id.split("?")[0].replace(/\\/g, "/");
      if (!/\/src\/.*\.(jsx?|css)$/.test(file) || file.includes("/node_modules/") || file.includes("/src/country/") || file.endsWith("companyLogo.js")) return null;
      const out = recolor(code);
      return out === code ? null : { code: out, map: null };
    },
    transformIndexHtml(html) {
      if (off) return html;
      return html
        .replace(/<meta name="theme-color" content="[^"]*"/, '<meta name="theme-color" content="#124554"')
        .replace(/<title>[^<]*<\/title>/, "<title>ONAS PeopleHub | AI HRMS</title>");
    },
  };
}
