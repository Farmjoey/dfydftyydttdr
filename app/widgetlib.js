// NOVA RIDE widget layouts: JSON <-> compact binary (max ~360 bytes) understood by the board.
// The same rules are enforced by the firmware parser (src/WidgetLayout.h). Keep both in sync.
(function (root) {
  'use strict';
  var TYPES = { text: 1, num: 2, bar: 3, ring: 4, modebar: 5, rect: 6 };
  var SRC = { none: 0, speed: 1, power: 2, battery: 3, volt: 4, current: 5, temp: 6, motortemp: 7, trip: 8, total: 9, mode: 10, fault: 11 };
  var COLORS = { text: 0, neon: 1, ok: 2, warn: 3, bad: 4, dim: 5, panel: 6 };
  var FONTS = { '2': 0, '4': 1, '6': 2, '7': 3, '8': 4 };
  var ALIGN = { left: 0, center: 1, right: 2 };
  var MAX_ITEMS = 16, MAX_STR = 8, STR_LEN = 12, TOP = 30;

  function inv(o) { var r = {}; Object.keys(o).forEach(function (k) { r[o[k]] = k; }); return r; }

  function compile(w) {
    var err = [];
    function bad(i, m) { err.push((i < 0 ? '' : 'Element ' + (i + 1) + ': ') + m); }
    if (!w || typeof w !== 'object') return { ok: false, errors: ['Ingen widget'] };
    var items = w.items;
    if (!Array.isArray(items) || items.length < 1) return { ok: false, errors: ['Widget skal have mindst ét element'] };
    if (items.length > MAX_ITEMS) return { ok: false, errors: ['Højst ' + MAX_ITEMS + ' elementer'] };
    var strs = [], out = [];
    function strIdx(s, i) {
      s = String(s == null ? '' : s);
      if (!/^[\x20-\x7E]*$/.test(s)) { bad(i, 'Tekst må kun have almindelige tegn (ASCII)'); return 255; }
      if (s.length === 0) return 255;
      if (s.length > STR_LEN - 1) { bad(i, 'Tekst maks ' + (STR_LEN - 1) + ' tegn'); return 255; }
      var k = strs.indexOf(s);
      if (k < 0) { if (strs.length >= MAX_STR) { bad(i, 'For mange forskellige tekster (maks ' + MAX_STR + ')'); return 255; } strs.push(s); k = strs.length - 1; }
      return k;
    }
    items.forEach(function (it, i) {
      var t = TYPES[it.t];
      if (!t) { bad(i, 'Ukendt type'); return; }
      var src = it.src == null ? 'none' : it.src, s = SRC[src];
      if (s === undefined) { bad(i, 'Ukendt kilde'); return; }
      var color = COLORS[it.color == null ? 'text' : it.color];
      if (color === undefined) { bad(i, 'Ukendt farve'); return; }
      var font = FONTS[String(it.font == null ? '2' : it.font)];
      if (font === undefined) { bad(i, 'Ukendt skrifttype (2, 4, 6, 7, 8)'); return; }
      var al = ALIGN[it.align == null ? 'left' : it.align];
      if (al === undefined) { bad(i, 'Ukendt justering'); return; }
      var dp = it.dp == null ? 0 : it.dp | 0;
      if (dp < 0 || dp > 2) { bad(i, 'Decimaler 0-2'); return; }
      var x = it.x | 0, y = it.y | 0, w2 = it.w | 0, h = it.h | 0, max = it.max | 0, str = 255;
      if (t === 1) {                                   // text
        if (s !== 0) bad(i, 'Tekst har ingen kilde');
        if (font > 1) bad(i, 'Tekst kan kun bruge skrift 2 eller 4');
        str = strIdx(it.text, i);
        if (str === 255) bad(i, 'Tekst mangler');
        if (y < TOP) bad(i, 'y skal være mindst ' + TOP);
      } else if (t === 2) {                            // number / value
        if (s === 0) bad(i, 'Tal skal have en kilde');
        if (s === SRC.mode && font > 1) bad(i, 'Tilstandsnavn kan kun bruge skrift 2 eller 4');
        str = strIdx(it.unit, i);
        if (y < TOP) bad(i, 'y skal være mindst ' + TOP);
      } else if (t === 3) {                            // bar
        if (s < 1 || s > 9) bad(i, 'Bjælke skal have en talkilde');
        if (max < 1 || max > 65535) bad(i, 'max skal være 1-65535');
        if (w2 < 8 || w2 > 320 || h < 3 || h > 40) bad(i, 'Bjælke: bredde 8-320, højde 3-40');
        if (y < TOP) bad(i, 'y skal være mindst ' + TOP);
      } else if (t === 4) {                            // ring
        var r = it.r | 0, th = it.th | 0; w2 = r; h = th;
        if (s < 1 || s > 9) bad(i, 'Ring skal have en talkilde');
        if (max < 1 || max > 65535) bad(i, 'max skal være 1-65535');
        if (r < 20 || r > 100 || th < 4 || th > 30 || th >= r) bad(i, 'Ring: radius 20-100, tykkelse 4-30 (mindre end radius)');
        if (y - r < TOP) bad(i, 'Ringen kommer for højt op (y - radius skal være mindst ' + TOP + ')');
        if (x - r < 0 || x + r > 320 || y + r > 240) bad(i, 'Ringen ligger uden for skærmen');
      } else if (t === 5) {                            // mode buttons (fixed place at the bottom)
        x = 0; y = TOP; w2 = 0; h = 0; s = 0;
      } else if (t === 6) {                            // rectangle outline
        if (w2 < 4 || w2 > 320 || h < 4 || h > 210) bad(i, 'Ramme: bredde 4-320, højde 4-210');
        if (y < TOP) bad(i, 'y skal være mindst ' + TOP);
      }
      if (t !== 4 && t !== 5 && (x < 0 || x > 319 || y > 239)) bad(i, 'Ligger uden for skærmen');
      out.push({ t: t, s: s, color: color, font: font, al: al, dp: dp, str: str, max: max, x: x, y: y, w: w2, h: h });
    });
    if (err.length) return { ok: false, errors: err };
    var n = out.length, total = 8 + strs.length * STR_LEN + n * 16, b = new Uint8Array(total);
    b[0] = 0x4E; b[1] = 0x57; b[2] = 1; b[3] = n; b[4] = strs.length; b[5] = 0; b[6] = total & 255; b[7] = total >> 8;
    strs.forEach(function (s, i) { for (var k = 0; k < s.length; k++) b[8 + i * STR_LEN + k] = s.charCodeAt(k); });
    var o = 8 + strs.length * STR_LEN;
    out.forEach(function (it, i) {
      var p = o + i * 16;
      b[p] = it.t; b[p + 1] = it.s; b[p + 2] = it.color; b[p + 3] = it.font; b[p + 4] = it.al | (it.dp << 4); b[p + 5] = it.str;
      b[p + 6] = it.max & 255; b[p + 7] = it.max >> 8;
      b[p + 8] = it.x & 255; b[p + 9] = (it.x >> 8) & 255; b[p + 10] = it.y & 255; b[p + 11] = (it.y >> 8) & 255;
      b[p + 12] = it.w & 255; b[p + 13] = it.w >> 8; b[p + 14] = it.h & 255; b[p + 15] = it.h >> 8;
    });
    return { ok: true, bytes: b, errors: [] };
  }

  // Basic checks for a JSON file that somebody else wrote (name, author, then the layout rules).
  function validateFile(w) {
    var e = [];
    if (!w || typeof w !== 'object') return ['Ikke et JSON-objekt'];
    if (w.v !== 1) e.push('v skal være 1');
    if (typeof w.name !== 'string' || !/^[\x20-\x7E]{2,24}$/.test(w.name)) e.push('name: 2-24 almindelige tegn');
    if (typeof w.author !== 'string' || !/^[\x20-\x7E]{1,24}$/.test(w.author)) e.push('author: 1-24 almindelige tegn');
    if (w.desc != null && (typeof w.desc !== 'string' || w.desc.length > 120)) e.push('desc: højst 120 tegn');
    var c = compile(w);
    if (!c.ok) e = e.concat(c.errors);
    return e;
  }

  var api = { compile: compile, validateFile: validateFile, TYPES: TYPES, SRC: SRC, COLORS: COLORS, FONTS: FONTS, ALIGN: ALIGN,
              SRC_NAMES: inv(SRC), COLOR_NAMES: inv(COLORS), TYPE_NAMES: inv(TYPES), TOP: TOP, MAX_ITEMS: MAX_ITEMS };
  root.NovaWidget = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
