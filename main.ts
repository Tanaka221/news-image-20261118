// world-news-18-nov-2026: a 1024x1024 newspaper front page summing up
// Wednesday 18 November 2026, drawn entirely in code (Node 22, standard
// library only, no network, no clock, no randomness). The program writes
// entry.png into MAKEFUN_OUTPUT_DIR (default /output). Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Design (my own): light newsprint front page, black masthead with a red
// rule, 13 illustrated headline panels in three rows, a dot-grid world map
// with the 13 headlines numbered on it, a numbered "also today" list, a
// region/field breakdown, and a DATE CHECK footer naming stories left out
// because they belong to other dates. All lettering is drawn by the 5x7
// bitmap font below, so no text can come out garbled.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font, drawn by hand. Each glyph is 7 rows of 5 cells, '#' = on.
// Only capitals, digits and common punctuation: all poster text is set in
// capitals, which suits a newspaper front page.
// ---------------------------------------------------------------------------
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '@': ['01110', '10001', '10111', '10101', '10110', '10000', '01110'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '•': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
};
// Normalise curly quotes/dashes to the ASCII glyphs above.
function norm(s: string): string {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/×/g, 'x')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer, 1024x1024, with rect / circle / line / polygon
// helpers and the text renderer. All coordinates are clipped to the canvas.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);
type RGB = [number, number, number];

function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r; px[i * 3 + 1] = g; px[i * 3 + 2] = b;
  }
}
function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}
function frame(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}
function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let yy = cy - r - t; yy <= cy + r + t; yy++) {
    for (let xx = cx - r - t; xx <= cx + r + t; xx++) {
      const d = Math.sqrt((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy));
      if (d >= r - t / 2 && d <= r + t / 2) setPx(xx, yy, c);
    }
  }
}
// Bresenham line with a square brush of width w.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  const half = Math.floor(w / 2);
  for (let guard = 0; guard < 4000; guard++) {
    for (let a = -half; a <= half; a++) {
      for (let b = -half; b <= half; b++) setPx(x + a, y + b, c);
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
// Filled polygon, scanline even-odd.
function poly(pts: [number, number][], c: RGB): void {
  let minY = H, maxY = 0;
  for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, xs[k]); x <= Math.min(W - 1, xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}
function textWidth(s: string, scale: number): number {
  return norm(s).length * 6 * scale - scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  const t = norm(s);
  let cx = x;
  for (const ch of t) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
// Greedy word wrap: lines that fit maxWidth px at the given scale.
function wrap(s: string, scale: number, maxWidth: number): string[] {
  const words = norm(s).split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxWidth || !cur) cur = trial;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder: filter 0, zlib level 9, CRC32. Deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length);
  crcIn.set(out.subarray(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc32(crcIn));
  return out;
}
function encodePNG(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const idat = deflateSync(raw, { level: 9 });
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---------------------------------------------------------------------------
// The day's news: Wednesday 18 November 2026. 44 stories, each verified
// from news search on 18 Nov (Reuters, AP wires via local outlets, BBC,
// CNN, USA Today, Zacks, WHO, USGS, ESPNcricinfo, ASEAN United FC, EU
// Council releases, central-bank statements). Wording is my own; claims are
// marked as claims ("says", "reported"). Stories first reported on 18 Nov
// about events late on 17 Nov are labelled as reported that day.
// Regions: Americas 14, Europe 10, Asia 8, Middle East 4, Africa 3,
// Oceania 3, Global 2 = 44. Fields: War 10, Politics 10, Economy 7,
// Disasters & Env 7, Diplomacy 4, Tech 2, Sport 2, Science 1, Health 1.
// ---------------------------------------------------------------------------
type Panel = {
  n: number; tag: string; head: string; fact: string;
  lon: number; lat: number; dx: number; dy: number; scene: number;
};
const PANELS: Panel[] = [
  { n: 1, tag: 'LEAD - MIDDLE EAST', head: 'TANKS ROLL INTO CENTRAL GAZA', fact: 'ISRAELI TANKS CROSS THE CEASEFIRE LINE; THREE KILLED, HAMAS CRIES FOUL', lon: 34.5, lat: 31.4, dx: 0, dy: 0, scene: 1 },
  { n: 2, tag: 'MIDDLE EAST', head: 'IRAN DRONES TARGET US BASE', fact: 'KUWAIT, BAHRAIN SAY ATTACKS INTERCEPTED; NO US HURT', lon: 48, lat: 29.3, dx: 10, dy: -8, scene: 2 },
  { n: 3, tag: 'UKRAINE', head: 'ODESA HIT AGAIN', fact: 'RUSSIAN STRIKES KILL 4 IN HISTORIC CENTRE', lon: 30.7, lat: 46.5, dx: -8, dy: -6, scene: 3 },
  { n: 4, tag: 'EUROPE', head: 'EU OFFERS 45BN UKRAINE LOAN', fact: '25BN ARMS, 20BN BUDGET FOR 2027; NEEDS EU OK', lon: 4.4, lat: 50.8, dx: 0, dy: 0, scene: 4 },
  { n: 5, tag: 'SPACE', head: 'VOYAGER 1 ONE LIGHT-DAY OUT', fact: 'SIGNALS NOW TAKE 24 HOURS TO REACH EARTH', lon: -118.2, lat: 34.2, dx: -14, dy: -10, scene: 5 },
  { n: 6, tag: 'ECONOMY', head: 'FED: MORE HIKES LIKELY', fact: 'MINUTES SHOW MOST BACK RISES; RATES HELD AT 3.75-4%', lon: -77, lat: 38.9, dx: -18, dy: -10, scene: 6 },
  { n: 7, tag: 'MARKETS', head: 'NVIDIA SHARES SLIP', fact: 'REVENUE UP 103% TO $115.8BN, BUT STOCKS FALL 2-3%', lon: -121, lat: 37.4, dx: 12, dy: 8, scene: 7 },
  { n: 8, tag: 'ASIA', head: 'BANK INDONESIA HIKES RATE', fact: 'RUPIAH AT RECORD LOW; RATE UP TO 6.00%', lon: 106.8, lat: -6.2, dx: 0, dy: -16, scene: 8 },
  { n: 9, tag: 'AMERICAS', head: 'US-VENEZUELA MILITARY DEAL', fact: 'HEGSETH SIGNS PACT IN CARACAS WITH RODRIGUEZ', lon: -66.9, lat: 10.5, dx: 0, dy: 0, scene: 9 },
  { n: 10, tag: 'AFRICA', head: 'ETHIOPIA AND ERITREA BUILD UP', fact: 'ARMIES MASS ON BORDER; WAR FEARS GROW', lon: 38, lat: 14.5, dx: 0, dy: 0, scene: 10 },
  { n: 11, tag: 'WEATHER', head: 'CYCLONE XAVIER SETS RECORD', fact: '145 MPH, STRONGEST NOVEMBER SOUTHERN STORM', lon: -160, lat: -21, dx: 0, dy: 0, scene: 11 },
  { n: 12, tag: 'HEALTH', head: 'WHO KEEPS EBOLA ALERT ON', fact: 'CONGO OUTBREAK STAYS A GLOBAL EMERGENCY', lon: 23, lat: -2, dx: 0, dy: 0, scene: 12 },
  { n: 13, tag: 'POLITICS', head: 'JEFFRIES WINS SPEAKER NOD', fact: 'HOUSE DEMOCRATS PICK HIM 251-11; VOTE IN JANUARY', lon: -77, lat: 38.9, dx: 18, dy: 10, scene: 13 },
];
// 31 more stories from the same day, numbered 14-44, two columns.
// Each line is at most 52 characters, so it fits one line at scale 1.
const MORE: string[] = [
  'ENGLAND BEAT AUSTRALIA BY 97 RUNS, WIN ODI SERIES 2-1',
  'UKRAINIAN DRONES HIT TWO REFINERIES IN KRASNODAR',
  'RUSSIA FIRES 141 DRONES; UKRAINE DOWNS 126',
  "ZELENSKYY: UKRAINE'S POSITIONS ARE STRONG",
  'KATZ: NO PULLOUT FROM GAZA, LEBANON, SYRIA ZONES',
  'RUBIO: NO IMMINENT IRANIAN THREAT TO THE US',
  'XI AND PUTIN TALK IN SHENZHEN AHEAD OF TRUMP MEET',
  'CANADA GIVES C$45M, AMMO AND SENSORS TO UKRAINE',
  'ADNOC SHIP HIT IN HORMUZ; 1 MISSING, 11 HURT',
  'US SENATE ADVANCES AFFORDABILITY BILL 65-31',
  'BURNHAM VOWS IMMEDIATE WELFARE REFORM AT PMQS',
  'EARLY VOTING OPENS FOR VICTORIA STATE ELECTION',
  'NORTH DAKOTA CERTIFIES 2026 ELECTION RESULTS',
  'HOUSE GOP CANCELS FRIDAY VOTES, LEAVES EARLY',
  'AL GREEN CLASHES WITH DHS CHIEF AT HEARING',
  "EU WARNS SERBIA'S NEW LEADERS BEFORE SUMMIT",
  'INDIA TOP COURT HEARS AZAM KHAN BAIL CHALLENGE',
  'EU PARLIAMENT SPLIT OVER ETS REFORM',
  'BANK OF GHANA CUTS RATE 300 PTS TO 11%',
  'GOLD FALLS TO ONE-YEAR LOW AS DOLLAR FIRMS',
  'US OIL STOCKS JUMP 3.4M BARRELS; PRICES FALL',
  'TJX BEATS FORECASTS; SHARES JUMP ABOUT 10%',
  'HO CHI MINH CITY POLICE BEAT BURIRAM 1-0',
  'PALO ALTO TO BUY APPLIED COMPUTE FOR $4.5BN',
  'TENCENT LAUNCHES HY4 FLASH AI MODEL',
  'EU DEAL TO SPEED UP GREEN ENERGY PERMITS',
  'ROMANIA QUAKE 5.3; TWO HURT BY FURNITURE',
  'PERU QUAKE 5.9 OFF THE COAST, NO CASUALTIES',
  'FLORES QUAKE 5.8; NO DAMAGE REPORTED',
  'CYCLONE AKVAN STRENGTHENS IN BAY OF BENGAL',
  'FLORIDA FLOODS CONTINUE AFTER 12 IN OF RAIN',
];
// Region breakdown (sums to 44) and field breakdown (sums to 44).
const REGIONS: { name: string; n: number }[] = [
  { name: 'AMERICAS', n: 14 },
  { name: 'EUROPE', n: 10 },
  { name: 'ASIA', n: 8 },
  { name: 'MIDDLE EAST', n: 4 },
  { name: 'AFRICA', n: 3 },
  { name: 'OCEANIA', n: 3 },
  { name: 'GLOBAL', n: 2 },
];
const FIELDS_LINE = 'WAR 10 - POLITICS 10 - ECONOMY 7 - DISASTERS 7 - DIPLOMACY 4 - TECH 2 - SPORT 2 - SCIENCE 1 - HEALTH 1';
// Dot-grid world map: land as [row, colStart, colEnd] runs on a 60x15 grid
// (10px cells; lon -180..180, lat 75..-55). Roughly traced by hand.
const LAND: [number, number, number][] = [
  [0, 2, 14], [0, 20, 22], [0, 28, 33], [0, 34, 56],
  [1, 1, 15], [1, 20, 22], [1, 28, 32], [1, 33, 57],
  [2, 2, 14], [2, 27, 31], [2, 33, 58],
  [3, 3, 13], [3, 28, 31], [3, 32, 35], [3, 36, 57], [3, 58, 58],
  [4, 3, 12], [4, 32, 34], [4, 38, 41], [4, 44, 50],
  [5, 4, 7], [5, 10, 14], [5, 28, 36], [5, 39, 41], [5, 45, 48],
  [6, 10, 15], [6, 28, 37], [6, 46, 48], [6, 47, 52],
  [7, 10, 15], [7, 29, 36], [7, 48, 53], [7, 52, 57],
  [8, 11, 14], [8, 30, 35], [8, 52, 57],
  [9, 11, 13], [9, 30, 34], [9, 53, 56],
  [10, 11, 13], [10, 31, 33], [10, 58, 59],
  [11, 12, 12], [11, 31, 32],
];

// ---------------------------------------------------------------------------
// Illustrated scenes, drawn in code (flat design). Each scene fills its
// panel image rect (x, y, w, h). No text inside scenes: all lettering is
// drawn by the layout code, so nothing can come out garbled.
// ---------------------------------------------------------------------------
const SAND: RGB = [214, 196, 150];
const SKY: RGB = [158, 198, 226];
const NAVY: RGB = [23, 42, 74];
function drawScene(id: number, x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w / 2);
  const by = y + h;
  if (id === 1) {
    // Tank on a road between damaged buildings.
    rect(x, y, w, h, [232, 214, 170]);
    rect(x, y + Math.floor(h * 0.55), w, Math.floor(h * 0.45), SAND);
    rect(x + 6, y + 8, Math.floor(w * 0.2), Math.floor(h * 0.5), [150, 138, 118]);
    rect(x + w - Math.floor(w * 0.24) - 6, y + 14, Math.floor(w * 0.24), Math.floor(h * 0.44), [168, 156, 134]);
    poly([[x + 6, y + 8], [x + 6 + Math.floor(w * 0.1), y - 2], [x + 6 + Math.floor(w * 0.2), y + 8]], [120, 108, 88]);
    rect(x, by - 14, w, 6, [90, 82, 70]);
    rect(cx - Math.floor(w * 0.28), by - 52, Math.floor(w * 0.56), 26, [74, 84, 72]);
    rect(cx - Math.floor(w * 0.16), by - 68, Math.floor(w * 0.32), 18, [88, 98, 86]);
    line(cx + Math.floor(w * 0.14), by - 60, cx + Math.floor(w * 0.42), by - 66, [60, 68, 58], 4);
    for (let i = 0; i < 5; i++) circle(cx - Math.floor(w * 0.22) + i * Math.floor(w * 0.11), by - 20, 5, [40, 44, 40]);
    poly([[cx + Math.floor(w * 0.3), by - 70], [cx + Math.floor(w * 0.36), by - 88], [cx + Math.floor(w * 0.42), by - 70]], [214, 90, 40]);
  } else if (id === 2) {
    // Drones over a missile launcher at dusk.
    rect(x, y, w, h, [26, 32, 58]);
    for (let i = 0; i < 14; i++) {
      const sx = x + ((i * 37) % w), sy = y + ((i * 23) % Math.floor(h * 0.4));
      rect(sx, sy, 2, 2, [240, 240, 220]);
    }
    rect(x, by - 16, w, 16, [52, 44, 38]);
    poly([[cx - 30, by - 16], [cx - 8, by - 58], [cx + 8, by - 58], [cx + 30, by - 16]], [90, 100, 110]);
    line(cx - 4, by - 58, cx - 14, by - 84, [200, 200, 200], 3);
    line(cx + 4, by - 58, cx + 12, by - 86, [200, 200, 200], 3);
    rect(cx - Math.floor(w * 0.3), y + 12, 26, 8, [180, 180, 170]);
    line(cx - Math.floor(w * 0.3) - 8, y + 16, cx - Math.floor(w * 0.3) + 34, y + 16, [180, 180, 170], 2);
    circle(cx - Math.floor(w * 0.3) + 13, y + 16, 3, [220, 90, 40]);
    rect(cx + 8, y + 26, 22, 7, [160, 160, 150]);
    line(cx, y + 29, cx + 32, y + 29, [160, 160, 150], 2);
    circle(cx + 40, y + 40, 7, [255, 170, 40]);
    circle(cx + 40, y + 40, 12, [255, 170, 40]);
  } else if (id === 3) {
    // Historic Odesa building under smoke.
    rect(x, y, w, h, SKY);
    circle(x + w - 22, y + 16, 10, [255, 214, 90]);
    rect(x + Math.floor(w * 0.12), y + Math.floor(h * 0.42), Math.floor(w * 0.76), Math.floor(h * 0.58), [238, 222, 190]);
    poly([[x + Math.floor(w * 0.12), y + Math.floor(h * 0.42)], [cx, y + Math.floor(h * 0.2)], [x + Math.floor(w * 0.88), y + Math.floor(h * 0.42)]], [176, 62, 52]);
    for (let i = 0; i < 4; i++) {
      const wx = x + Math.floor(w * 0.2) + i * Math.floor(w * 0.17);
      rect(wx, y + Math.floor(h * 0.58), 10, 16, [90, 70, 60]);
    }
    for (let i = 0; i < 3; i++) {
      circle(cx - 34 + i * 30, y + 10 + (i % 2) * 8, 12, [120, 120, 118]);
      circle(cx - 26 + i * 30, y + 18 + (i % 2) * 8, 9, [140, 140, 138]);
    }
    poly([[x + Math.floor(w * 0.55), y + Math.floor(h * 0.42)], [x + Math.floor(w * 0.68), y + Math.floor(h * 0.3)], [x + Math.floor(w * 0.8), y + Math.floor(h * 0.42)]], [120, 110, 96]);
  } else if (id === 4) {
    // EU flag ring of stars over gold coins.
    rect(x, y, w, h, [28, 62, 138]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sx = Math.round(cx + Math.cos(a) * Math.floor(w * 0.3));
      const sy = Math.round(y + Math.floor(h * 0.42) + Math.sin(a) * Math.floor(h * 0.3));
      poly([[sx, sy - 5], [sx + 2, sy - 1], [sx + 5, sy], [sx + 2, sy + 2], [sx + 1, sy + 5], [sx - 1, sy + 2], [sx - 4, sy + 2], [sx - 2, sy - 1]], [255, 210, 60]);
    }
    for (let i = 0; i < 3; i++) rect(cx - 34 + i * 24, by - 26 - i * 8, 44, 8, [232, 192, 90]);
    rect(cx - 34, by - 26, 44, 8, [200, 160, 60]);
    circle(cx + 52, by - 34, 12, [255, 210, 60]);
    ring(cx + 52, by - 34, 12, [180, 140, 40], 2);
  } else if (id === 5) {
    // Voyager 1 in deep space, signal waves back to Earth.
    rect(x, y, w, h, [8, 10, 24]);
    for (let i = 0; i < 22; i++) {
      const sx = x + ((i * 41) % w), sy = y + ((i * 29) % h);
      rect(sx, sy, 2, 2, [230, 230, 210]);
    }
    circle(x + 18, by - 18, 9, [70, 130, 200]);
    ring(x + 18, by - 18, 13, [70, 130, 200], 1);
    ring(x + 18, by - 18, 17, [70, 130, 200], 1);
    poly([[cx - 6, y + Math.floor(h * 0.3)], [cx + 26, y + Math.floor(h * 0.42)], [cx - 6, y + Math.floor(h * 0.55)]], [220, 190, 90]);
    circle(cx - 10, y + Math.floor(h * 0.42), 8, [200, 170, 70]);
    line(cx + 26, y + Math.floor(h * 0.42), cx + 52, y + Math.floor(h * 0.3), [220, 190, 90], 2);
    line(cx + 26, y + Math.floor(h * 0.42), cx + 52, y + Math.floor(h * 0.55), [220, 190, 90], 2);
    rect(cx - 34, y + Math.floor(h * 0.36), 26, 12, [160, 170, 190]);
  } else if (id === 6) {
    // Central bank: columns, rising bars, red arrow.
    rect(x, y, w, h, [226, 232, 238]);
    poly([[x + 8, y + Math.floor(h * 0.34)], [cx, y + 8], [x + w - 8, y + Math.floor(h * 0.34)]], [90, 100, 116]);
    for (let i = 0; i < 4; i++) rect(x + 14 + i * Math.floor(w * 0.22), y + Math.floor(h * 0.38), 10, Math.floor(h * 0.42), [150, 158, 168]);
    rect(x + 8, y + Math.floor(h * 0.8), w - 16, 8, [90, 100, 116]);
    const bh = [10, 16, 22, 30];
    for (let i = 0; i < 4; i++) rect(x + w - 62 + i * 14, by - 12 - bh[i], 10, bh[i], [30, 90, 160]);
    line(x + w - 66, by - 46, x + w - 8, by - 52, [176, 32, 44], 3);
    poly([[x + w - 14, by - 58], [x + w - 4, by - 50], [x + w - 20, by - 46]], [176, 32, 44]);
  } else if (id === 7) {
    // Chip with a falling red line.
    rect(x, y, w, h, [14, 34, 20]);
    rect(cx - 26, y + Math.floor(h * 0.3), 52, 40, [24, 120, 70]);
    frame(cx - 26, y + Math.floor(h * 0.3), 52, 40, [120, 220, 150], 2);
    rect(cx - 10, y + Math.floor(h * 0.3) + 14, 20, 12, [160, 240, 180]);
    for (let i = 0; i < 4; i++) {
      rect(cx - 26 + i * 14, y + Math.floor(h * 0.3) - 8, 4, 8, [180, 180, 170]);
      rect(cx - 26 + i * 14, y + Math.floor(h * 0.3) + 40, 4, 8, [180, 180, 170]);
    }
    line(x + 8, y + 12, cx, y + Math.floor(h * 0.24), [90, 220, 120], 2);
    line(cx, y + Math.floor(h * 0.24), x + w - 10, by - 10, [220, 60, 50], 3);
    poly([[x + w - 18, by - 18], [x + w - 6, by - 6], [x + w - 22, by - 2]], [220, 60, 50]);
  } else if (id === 8) {
    // Rupiah: coin and a rising arrow over waves.
    rect(x, y, w, h, [16, 96, 92]);
    for (let i = 0; i < 3; i++) {
      line(x + 6, by - 14 - i * 8, x + w - 6, by - 18 - i * 8, [120, 200, 190], 2);
    }
    circle(cx, y + Math.floor(h * 0.42), 22, [232, 192, 90]);
    ring(cx, y + Math.floor(h * 0.42), 22, [180, 140, 40], 2);
    circle(cx, y + Math.floor(h * 0.42), 10, [200, 160, 60]);
    line(cx + 26, y + Math.floor(h * 0.62), cx + 26, y + 8, [255, 90, 60], 4);
    poly([[cx + 26, y + 2], [cx + 16, y + 18], [cx + 36, y + 18]], [255, 90, 60]);
  } else if (id === 9) {
    // Two flags and a signed document.
    rect(x, y, w, h, [238, 232, 214]);
    line(x + 14, y + 6, x + 14, by - 8, [60, 60, 60], 2);
    line(x + w - 14, y + 6, x + w - 14, by - 8, [60, 60, 60], 2);
    for (let i = 0; i < 4; i++) rect(x + 14, y + 8 + i * 6, 34, 3, i % 2 ? [255, 255, 255] : [190, 40, 50]);
    rect(x + 14, y + 8, 14, 10, [30, 60, 140]);
    rect(x + w - 48, y + 8, 34, 8, [250, 210, 40]);
    rect(x + w - 48, y + 16, 34, 8, [30, 80, 180]);
    rect(x + w - 48, y + 24, 34, 8, [210, 40, 40]);
    rect(cx - 26, by - 34, 52, 26, [255, 255, 255]);
    frame(cx - 26, by - 34, 52, 26, [40, 40, 40], 1);
    line(cx - 18, by - 26, cx + 18, by - 26, [60, 60, 60], 1);
    line(cx - 18, by - 20, cx + 10, by - 20, [60, 60, 60], 1);
    circle(cx + 16, by - 14, 5, [176, 32, 44]);
  } else if (id === 10) {
    // Two armies facing each other across a line, mountains behind.
    rect(x, y, w, h, [222, 208, 176]);
    poly([[x, y + Math.floor(h * 0.5)], [x + Math.floor(w * 0.3), y + 6], [x + Math.floor(w * 0.55), y + Math.floor(h * 0.5)]], [140, 130, 110]);
    poly([[x + Math.floor(w * 0.45), y + Math.floor(h * 0.5)], [x + Math.floor(w * 0.75), y + 2], [x + w, y + Math.floor(h * 0.5)]], [120, 112, 96]);
    rect(x, y + Math.floor(h * 0.5), w, Math.floor(h * 0.5), [190, 172, 130]);
    for (let s = 0; s < 4; s++) {
      line(cx, by - 8 - s * 10, cx, by - 14 - s * 10, [176, 32, 44], 3);
    }
    for (let i = 0; i < 4; i++) {
      const sx = x + 10 + i * 16;
      circle(sx, by - 34, 5, [60, 70, 60]);
      rect(sx - 4, by - 30, 8, 20, [60, 70, 60]);
      const tx = x + w - 18 - i * 16;
      circle(tx, by - 34, 5, [90, 60, 50]);
      rect(tx - 4, by - 30, 8, 20, [90, 60, 50]);
    }
  } else if (id === 11) {
    // Cyclone spiral over the ocean, bent palm.
    rect(x, y, w, h, [30, 110, 150]);
    rect(x, by - 18, w, 18, [16, 80, 120]);
    for (let r = 34; r >= 8; r -= 7) ring(cx, y + Math.floor(h * 0.45), r, [240, 244, 250], 3);
    circle(cx, y + Math.floor(h * 0.45), 6, [240, 244, 250]);
    line(x + 12, by - 18, x + 22, y + Math.floor(h * 0.45), [120, 90, 60], 3);
    for (let i = 0; i < 4; i++) {
      line(x + 22, y + Math.floor(h * 0.45), x + 34 + i * 6, y + Math.floor(h * 0.45) - 8 + i * 6, [40, 140, 80], 2);
    }
    for (let i = 0; i < 5; i++) line(x + 8 + i * 12, y + 8 + (i % 2) * 6, x + 16 + i * 12, y + 20 + (i % 2) * 6, [200, 220, 240], 1);
  } else if (id === 12) {
    // Virus under a medical cross.
    rect(x, y, w, h, [238, 240, 244]);
    rect(cx - 34, y + 8, 12, 28, [200, 40, 50]);
    rect(cx - 40, y + 14, 24, 12, [200, 40, 50]);
    circle(cx + 8, by - 30, 16, [140, 40, 60]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(cx + 8 + Math.round(Math.cos(a) * 16), by - 30 + Math.round(Math.sin(a) * 16),
        cx + 8 + Math.round(Math.cos(a) * 24), by - 30 + Math.round(Math.sin(a) * 24), [140, 40, 60], 2);
    }
    circle(cx + 2, by - 34, 3, [255, 255, 255]);
    circle(cx + 14, by - 24, 3, [255, 255, 255]);
    ring(cx + 8, by - 30, 28, [90, 100, 116], 2);
  } else {
    // Capitol dome and ballot box.
    rect(x, y, w, h, [200, 216, 236]);
    rect(cx - 40, by - 30, 80, 22, [250, 250, 246]);
    for (let i = 0; i < 4; i++) rect(cx - 34 + i * 20, by - 52, 8, 22, [220, 222, 216]);
    poly([[cx - 26, by - 52], [cx, by - 78], [cx + 26, by - 52]], [250, 250, 246]);
    circle(cx, by - 76, 4, [200, 170, 60]);
    rect(cx + 30, by - 26, 26, 18, [30, 80, 160]);
    rect(cx + 36, by - 32, 14, 6, [30, 80, 160]);
    line(cx + 30, by - 34, cx + 44, by - 46, [220, 220, 220], 2);
  }
}

// ---------------------------------------------------------------------------
// Layout: light newsprint front page.
// ---------------------------------------------------------------------------
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [26, 26, 26];
const RED: RGB = [179, 32, 44];
const CARD: RGB = [255, 253, 247];
const SEA: RGB = [208, 224, 238];
const LANDC: RGB = [52, 84, 122];

function drawPanel(p: Panel, x: number, y: number, w: number, h: number, big: boolean): void {
  rect(x, y, w, h, CARD);
  frame(x, y, w, h, INK, 1);
  const sceneH = big ? 88 : (h > 150 ? 64 : 58);
  drawScene(p.scene, x + 1, y + 1, w - 2, sceneH);
  // Number badge on the scene's top-left corner.
  const bx = x + 9, by = y + 9;
  circle(bx, by, 9, RED);
  drawTextCentered(String(p.n), bx, by - 3, 1, [255, 255, 255]);
  const tx = x + 8;
  let cy = y + sceneH + 6;
  drawText(p.tag, tx, cy, 1, RED);
  cy += 11;
  const headScale = big ? 3 : 2;
  const headLines = wrap(p.head, headScale, w - 16);
  for (const ln of headLines.slice(0, 2)) {
    drawText(ln, tx, cy, headScale, INK);
    cy += 7 * headScale;
  }
  cy += 4;
  const factScale = big ? 2 : 1;
  const factLines = wrap(p.fact, factScale, w - 16);
  for (const ln of factLines.slice(0, 3)) {
    drawText(ln, tx, cy, factScale, [64, 64, 64]);
    cy += 7 * factScale + (factScale === 2 ? 1 : 0);
  }
}

function render(): void {
  fill(PAPER[0], PAPER[1], PAPER[2]);
  // Masthead.
  drawTextCentered('THE WORLD IN ONE DAY', 512, 14, 5, INK);
  drawTextCentered('WEDNESDAY 18 NOVEMBER 2026 - 44 VERIFIED STORIES - 7 REGIONS - 9 FIELDS', 512, 58, 2, [64, 64, 64]);
  rect(16, 86, 992, 5, RED);
  rect(16, 94, 992, 2, INK);
  // Row A: lead + 2 panels.
  drawPanel(PANELS[0], 16, 110, 392, 206, true);
  drawPanel(PANELS[1], 416, 110, 292, 206, true);
  drawPanel(PANELS[2], 716, 110, 292, 206, true);
  // Row B: 5 panels.
  for (let i = 0; i < 5; i++) drawPanel(PANELS[3 + i], 16 + i * 200, 324, 192, 150, false);
  // Row C: 5 panels.
  for (let i = 0; i < 5; i++) drawPanel(PANELS[8 + i], 16 + i * 200, 482, 192, 136, false);
  // Map section.
  drawText('WHERE IT HAPPENED - 13 HEADLINES ON THE MAP', 16, 626, 2, INK);
  const mapX = 16, mapY = 644, mapW = 600, mapH = 164;
  rect(mapX, mapY, mapW, mapH, SEA);
  frame(mapX, mapY, mapW, mapH, INK, 1);
  for (const [r, c0, c1] of LAND) {
    for (let c = c0; c <= c1; c++) {
      circle(mapX + c * 10 + 5, mapY + 10 + r * 10 + 5, 3, LANDC);
    }
  }
  for (const p of PANELS) {
    const mx = Math.round(mapX + ((p.lon + 180) / 360) * mapW);
    const my = Math.round(mapY + 10 + ((75 - p.lat) / 130) * 150);
    const nx = mx + p.dx, ny = my + p.dy;
    if (p.dx !== 0 || p.dy !== 0) line(mx, my, nx, ny, RED, 1);
    circle(nx, ny, 8, RED);
    drawTextCentered(String(p.n), nx, ny - 3, 1, [255, 255, 255]);
  }
  // Region breakdown box.
  const bx = 624, by = 644, bw = 384, bh = 164;
  rect(bx, by, bw, bh, CARD);
  frame(bx, by, bw, bh, INK, 1);
  drawText('BY REGION - 44 STORIES', bx + 10, by + 8, 2, INK);
  REGIONS.forEach((r, i) => {
    const ry = by + 28 + i * 15;
    drawText(r.name, bx + 10, ry, 1, INK);
    rect(bx + 86, ry, r.n * 12, 8, NAVY);
    drawText(String(r.n), bx + 86 + r.n * 12 + 6, ry, 1, INK);
  });
  const fieldLines = wrap(FIELDS_LINE, 1, bw - 20);
  fieldLines.slice(0, 2).forEach((ln, i) => drawText(ln, bx + 10, by + 136 + i * 8, 1, [64, 64, 64]));
  // Numbered list, two columns.
  drawText('ALSO ON WEDNESDAY - 31 MORE STORIES', 16, 816, 2, INK);
  MORE.forEach((item, i) => {
    const col = i < 16 ? 0 : 1;
    const row = i < 16 ? i : i - 16;
    const lx = 16 + col * 504;
    const ly = 836 + row * 8;
    drawText(String(14 + i) + '.', lx, ly, 1, RED);
    drawText(item, lx + 24, ly, 1, INK);
  });
  // Date-check footer.
  frame(16, 970, 992, 42, RED, 2);
  drawText('DATE CHECK - LEFT OUT ON PURPOSE (WRONG DATE): KERCH BRIDGE STRIKE 17 NOV; US JETS HIT QESHM 17 NOV; BRAZIL 7-0 17 NOV;', 26, 978, 1, RED);
  drawText('ARGENTINA 7-0 17 NOV; GPT-6.2 LAUNCH 17 NOV; HUANG RESIGNS 12 NOV; AFCON QUALIFIERS 17 NOV. EVERY STORY ABOVE IS 18 NOV 2026.', 26, 989, 1, INK);
}

function main(): void {
  render();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}
main();
