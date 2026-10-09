(function(){
'use strict';
var VERSION = 1;
var $ = function(id){ return document.getElementById(id); };
var DEFAULT_SPORTS = ['Squash', 'Padel', 'Boxen', 'Crosstrainer', 'WellY-Kraft', 'Laufband'];
// Felder: t = int | dec | hm (Std:Min, gespeichert in Minuten)
var F = {
  mS: { t: 'int', min: 40, max: 300 },  mD: { t: 'int', min: 20, max: 250 },  mP: { t: 'int', min: 20, max: 250 },
  aS: { t: 'int', min: 40, max: 300 },  aD: { t: 'int', min: 20, max: 250 },  aP: { t: 'int', min: 20, max: 250 },
  w: { t: 'dec', min: 20, max: 400 },
  steps: { t: 'int', min: 0, max: 300000 }, pai: { t: 'int', min: 0, max: 5000 },
  kOut: { t: 'int', min: 0, max: 30000 }, kIn: { t: 'int', min: 0, max: 30000 },
  form: { t: 'int', min: -999, max: 999, neg: true }, ist: { t: 'int', min: 0, max: 99999 }, soll: { t: 'int', min: 0, max: 99999 },
  sleep: { t: 'hm', min: 0, max: 1440 }, apnoe: { t: 'dec', min: 0, max: 500 }
};
var NUMKEYS = Object.keys(F);
var PALETTE = ['#30d158','#ff9f0a','#4da3ff','#ff6482','#bf5af2','#ffd60a','#64d2ff','#ff453a','#a2845e','#5e5ce6','#8e8e93','#66d4a0'];

var days = {};                 // 'YYYY-MM-DD' -> Datensatz
var settings = { height: 185, heightSet: false, sports: DEFAULT_SPORTS.slice() };
var persisted = null;

// ---------- Hilfen ----------
function pad(n){ return (n < 10 ? '0' : '') + n; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function dayKey(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function kd(k){ var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(k, n){ var d = kd(k); return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
function todayKey(){ return dayKey(new Date()); }
function diffDays(a, b){ return Math.round((kd(b) - kd(a)) / 86400000); }
function fmtDate(k){ var d = kd(k); return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + '.' + d.getFullYear(); }
function fmtShort(k){ var d = kd(k); return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + '.'; }
function wdShort(k){ return kd(k).toLocaleDateString('de-DE', { weekday: 'short' }).replace(/\.?$/, '.'); }
function wdLong(k){ return kd(k).toLocaleDateString('de-DE', { weekday: 'long' }); }
function relTxt(k){
  var n = diffDays(todayKey(), k);
  if (n === 0) return 'Heute'; if (n === -1) return 'Gestern'; if (n === 1) return 'Morgen';
  return n < 0 ? 'vor ' + (-n) + ' Tagen' : 'in ' + n + ' Tagen';
}
function num(v, dec){ return v == null || isNaN(v) ? '' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0, useGrouping: false }); }
function numG(v, dec){ return v == null || isNaN(v) ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
function signed(v, dec){ if (v == null || isNaN(v)) return '–'; var s = numG(Math.abs(v), dec); return (v > 0 ? '+' : v < 0 ? '−' : '±') + s; }
function hm(min, lead){ if (min == null || isNaN(min)) return ''; var h = Math.floor(min / 60), m = Math.round(min % 60); if (m === 60){ h++; m = 0; } return (lead ? pad(h) : h) + ':' + pad(m); }
function round1(v){ return Math.round(v * 10) / 10; }
function avg(a){ a = a.filter(function(x){ return x != null && !isNaN(x); }); return a.length ? a.reduce(function(s, x){ return s + x; }, 0) / a.length : null; }

// Zahl lesen: "122,4" "122.4" "12.636" (Tausender) "-17"
function parseNumber(s, isInt){
  s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/^[−–]/, '-');
  if (!s) return null;
  if (isInt && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(s)) return NaN;
  return Number(s);
}
// Schlafdauer: "7:12" "07:12" "712" "7" "7,5" (Std) "07:12:00" -> Minuten
function parseHM(s){
  s = String(s == null ? '' : s).trim();
  if (!s) return null;
  var m = s.match(/^(\d{1,2})[:.h ](\d{1,2})(?::\d{2})?$/);
  if (m){ var mm = +m[2]; if (mm > 59) return NaN; return +m[1] * 60 + mm; }
  if (/^\d{3,4}$/.test(s)){ var x = +s.slice(-2); if (x > 59) return NaN; return +s.slice(0, -2) * 60 + x; }
  if (/^\d{1,2}$/.test(s)) return +s * 60;
  var f = parseNumber(s);
  if (!isNaN(f) && f != null){ if (f > 0 && f < 1) return Math.round(f * 1440); if (f < 24) return Math.round(f * 60); }
  return NaN;
}
function parseField(k, str){
  var d = F[k], v;
  if (d.t === 'hm') v = parseHM(str);
  else { v = parseNumber(str, d.t === 'int'); if (v != null && !isNaN(v)) v = d.t === 'int' ? Math.round(v) : round1(v); }
  if (v == null) return { ok: true, v: null };
  if (isNaN(v) || v < d.min || v > d.max) return { ok: false, v: null };
  return { ok: true, v: v };
}
function fmtField(k, v){ if (v == null) return ''; var d = F[k]; return d.t === 'hm' ? hm(v) : num(v, d.t === 'dec' ? 1 : 0); }
function bmiOf(w){ var h = (settings.height || 0) / 100; return w != null && h > 0.5 ? round1(w / (h * h)) : null; }
function deficit(r){ return r && r.kOut != null && r.kIn != null ? r.kOut - r.kIn : null; }
function sportMin(r){ return r && r.sport ? r.sport.reduce(function(s, x){ return s + (x.m || 0); }, 0) : 0; }
function sportText(r){ return r && r.sport ? r.sport.map(function(x){ return x.t + (x.m != null ? ' ' + x.m : ''); }).join('; ') : ''; }
// Gewicht etwa "back" Tage vorher (nächster Tag mit Gewicht innerhalb ±tol, ältere bevorzugt)
function weightAround(k, back, tol){
  for (var i = 0; i <= tol; i++){
    var a = days[addDays(k, -(back + i))]; if (a && a.w != null) return a.w;
    if (i){ var b = days[addDays(k, -(back - i))]; if (b && b.w != null) return b.w; }
  }
  return null;
}
function trend(k, w, back, tol){ if (w == null) return null; var r = weightAround(k, back, tol); return r == null ? null : round1(w - r); }
function isEmptyRec(r){
  if (!r) return true;
  if (NUMKEYS.some(function(k){ return r[k] != null; })) return false;
  return !(r.note && r.note.trim()) && !(r.sport && r.sport.length);
}

// ---------- IndexedDB ----------
var idbP = null;
function idb(){
  if (idbP) return idbP;
  idbP = new Promise(function(res, rej){
    if (!window.indexedDB) return rej(new Error('IndexedDB nicht verfügbar'));
    var rq = indexedDB.open('tageswerte', 1);
    rq.onupgradeneeded = function(){
      var d = rq.result;
      if (!d.objectStoreNames.contains('days')) d.createObjectStore('days', { keyPath: 'd' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    };
    rq.onsuccess = function(){ res(rq.result); };
    rq.onerror = function(){ rej(rq.error); };
  });
  return idbP;
}
function tx(stores, mode, fn){
  return idb().then(function(d){ return new Promise(function(res, rej){
    var t = d.transaction(stores, mode), out = fn(t);
    t.oncomplete = function(){ res(out); };
    t.onerror = t.onabort = function(){ rej(t.error || new Error('Speicherfehler')); };
  }); });
}
var writeQ = Promise.resolve();
function queue(fn){ writeQ = writeQ.then(fn).catch(function(e){ toast('Speichern fehlgeschlagen: ' + (e && e.message), null, true); }); return writeQ; }
function putDays(list){ return queue(function(){ return tx(['days'], 'readwrite', function(t){ var s = t.objectStore('days'); list.forEach(function(r){ s.put(r); }); }); }); }
function delDay(k){ return queue(function(){ return tx(['days'], 'readwrite', function(t){ t.objectStore('days')['delete'](k); }); }); }
function saveSettings(){ var s = JSON.parse(JSON.stringify(settings)); return queue(function(){ return tx(['meta'], 'readwrite', function(t){ t.objectStore('meta').put(s, 'settings'); }); }); }
var ready = idb().then(function(){
  return tx(['meta','days'], 'readonly', function(t){ return { s: t.objectStore('meta').get('settings'), d: t.objectStore('days').getAll() }; });
}).then(function(r){
  var s = r.s.result;
  if (s && Array.isArray(s.sports)) settings = { height: +s.height || 185, heightSet: !!s.heightSet, sports: s.sports.slice() };
  else saveSettings();
  (r.d.result || []).forEach(function(x){ if (x && x.d) days[x.d] = x; });
}).catch(function(e){ toast('Datenbank-Fehler: ' + e.message, null, true); });
if (navigator.storage && navigator.storage.persist){
  try{ navigator.storage.persisted().then(function(p){ if (p) return true; return navigator.storage.persist(); }).then(function(p){ persisted = !!p; }).catch(function(){}); }catch(e){}
}

// ---------- Toast / Hinweis ----------
var toastTimer = null, toastUndo = null;
function toast(msg, undo, err){
  $('toastTxt').textContent = msg;
  toastUndo = undo || null;
  $('toastBtn').style.display = undo ? '' : 'none';
  $('toast').className = 'toast on' + (err ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ $('toast').className = 'toast' + (err ? ' err' : ''); }, undo ? 6000 : 2800);
}
$('toastBtn').addEventListener('click', function(){ var u = toastUndo; toastUndo = null; $('toast').className = 'toast'; if (u) u(); });
var savedTimer = null;
function savedHint(txt){
  var el = $('saved'); el.textContent = txt || '✓ gespeichert'; el.className = 'on';
  clearTimeout(savedTimer); savedTimer = setTimeout(function(){ el.className = ''; }, 1400);
}

// ---------- Tag ----------
var cur = todayKey();
var inputs = {};
NUMKEYS.forEach(function(k){ inputs[k] = $('f-' + k); });
var noteIn = $('f-note');
var saveTimer = null;

function sportRowsHTML(list){
  return list.map(function(s, i){
    return '<div class="srow" data-i="' + i + '"><input class="st" type="text" value="' + esc(s.t) + '" placeholder="Sportart" enterkeyhint="next" autocapitalize="words" aria-label="Sportart">'
      + '<input class="sm" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="' + esc(s.m == null ? '' : s.m) + '" placeholder="–" aria-label="Minuten"><span class="u">min</span>'
      + '<button type="button" class="x" aria-label="Entfernen">✕</button></div>';
  }).join('');
}
function renderSportChips(){
  $('sportChips').innerHTML = settings.sports.map(function(s){ return '<button type="button" class="chip" data-sp="' + esc(s) + '">＋ ' + esc(s) + '</button>'; }).join('')
    + '<button type="button" class="chip oth" data-sp="">＋ Andere</button>';
}
function readSport(){
  var out = [];
  Array.prototype.forEach.call(document.querySelectorAll('#sportRows .srow'), function(r){
    var t = r.querySelector('.st').value.trim(), mIn = r.querySelector('.sm'), m = parseNumber(mIn.value, true);
    var bad = m != null && (isNaN(m) || m < 0 || m > 1440);
    mIn.classList.toggle('bad', bad);
    if (bad) m = null;
    if (t || m != null) out.push({ t: t || 'Sport', m: m == null ? null : Math.round(m) });
  });
  return out;
}
function collect(){
  var prev = days[cur], r = { d: cur };
  NUMKEYS.forEach(function(k){
    var p = parseField(k, inputs[k].value);
    inputs[k].classList.toggle('bad', !p.ok);
    if (p.ok){ if (p.v != null) r[k] = p.v; }
    else if (prev && prev[k] != null) r[k] = prev[k];   // ungültige Eingabe: alten Wert behalten
  });
  var n = noteIn.value.trim(); if (n) r.note = n;
  var sp = readSport(); if (sp.length) r.sport = sp;
  return r;
}
function norm(o){
  if (Array.isArray(o)) return o.map(norm);
  if (o && typeof o === 'object'){ var x = {}; Object.keys(o).sort().forEach(function(k){ if (k !== 'updated' && k !== 'created') x[k] = norm(o[k]); }); return x; }
  return o;
}
function sameRec(a, b){ return JSON.stringify(norm(a || {})) === JSON.stringify(norm(b || {})); }
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  var r = collect(), prev = days[cur];
  if (isEmptyRec(r)){
    if (!prev) return;
    delete days[cur]; delDay(cur); savedHint('✓ gespeichert (Tag leer)'); return;
  }
  if (prev && sameRec(prev, r)) return;
  r.created = prev && prev.created || new Date().toISOString();
  r.updated = new Date().toISOString();
  days[cur] = r; putDays([r]); savedHint();
  // neue Sportart automatisch in die Schnellauswahl
  var added = false;
  (r.sport || []).forEach(function(s){
    if (s.t && s.t !== 'Sport' && !settings.sports.some(function(x){ return x.toLowerCase() === s.t.toLowerCase(); })){ settings.sports.push(s.t); added = true; }
  });
  if (added){ saveSettings(); renderSportChips(); }
}
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 600); }
function flushSave(){ if (saveTimer) saveNow(); }

function updateComputed(){
  var w = parseField('w', inputs.w.value).v, b = bmiOf(w);
  setCV('c-bmi', b == null ? '–' : num(b, 1), '');
  var wk = trend(cur, w, 7, 3), mo = trend(cur, w, 30, 7);
  setCV('c-wk', wk == null ? '–' : signed(wk, 1) + ' kg', wk == null ? 'na' : wk < 0 ? 'pos' : wk > 0 ? 'neg' : '');
  setCV('c-mo', mo == null ? '–' : signed(mo, 1) + ' kg', mo == null ? 'na' : mo < 0 ? 'pos' : mo > 0 ? 'neg' : '');
  var ko = parseField('kOut', inputs.kOut.value).v, ki = parseField('kIn', inputs.kIn.value).v;
  var df = ko != null && ki != null ? ko - ki : null;
  setCV('c-def', df == null ? '–' : num(df), df == null ? 'na' : df > 0 ? 'pos' : df < 0 ? 'neg' : '');
  var sp = readSport(), tot = sp.reduce(function(s, x){ return s + (x.m || 0); }, 0);
  $('c-sport').textContent = sp.length ? (tot ? tot + ' min' : '') + (sp.length > 1 ? ' · ' + sp.length + ' Einheiten' : '') : '';
}
function setCV(id, txt, cls){ var el = $(id); el.querySelector('span').textContent = txt; el.className = 'cv' + (cls ? ' ' + cls : ''); }

function renderHeader(){
  var t = cur === todayKey();
  $('d1').innerHTML = esc(wdLong(cur)) + ' · ' + (t ? '<b>Heute</b>' : esc(relTxt(cur)));
  $('d2').textContent = fmtDate(cur);
  $('datePick').value = cur;
  $('todayBtn').style.visibility = t ? 'hidden' : 'visible';
}
function loadDay(k, dir){
  flushSave();
  cur = k;
  var r = days[k] || {};
  NUMKEYS.forEach(function(f){ inputs[f].value = fmtField(f, r[f]); inputs[f].classList.remove('bad'); });
  noteIn.value = r.note || ''; growNote();
  $('sportRows').innerHTML = sportRowsHTML(r.sport || []);
  renderHeader(); updateComputed();
  if (dir){ var b = $('dayBody'); b.className = ''; void b.offsetWidth; b.className = dir > 0 ? 'swl' : 'swr'; }
}
function goDay(n){
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  loadDay(addDays(cur, n), n);
}
$('prevDay').addEventListener('click', function(){ goDay(-1); });
$('nextDay').addEventListener('click', function(){ goDay(1); });
$('todayBtn').addEventListener('click', function(){ var t = todayKey(); loadDay(t, t > cur ? 1 : -1); });
$('datePick').addEventListener('change', function(){ var v = this.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v !== cur) loadDay(v, v > cur ? 1 : -1); });
$('dateBox').addEventListener('click', function(e){
  var p = $('datePick');
  if (e.target === p && p.showPicker){ try{ p.showPicker(); }catch(_){} }
});

// Wischen
var sw = null;
$('v-day').addEventListener('touchstart', function(e){
  if (e.touches.length !== 1){ sw = null; return; }
  var t = e.touches[0];
  sw = { x: t.clientX, y: t.clientY, t: Date.now(), focused: e.target === document.activeElement && /INPUT|TEXTAREA/.test(e.target.tagName) };
}, { passive: true });
$('v-day').addEventListener('touchend', function(e){
  if (!sw || sw.focused) { sw = null; return; }
  var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t;
  sw = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && dt < 900) goDay(dx < 0 ? 1 : -1);
}, { passive: true });

// Eingaben
function navOrder(){ return Array.prototype.filter.call(document.querySelectorAll('#dayBody input.num, #dayBody .srow input, #f-note'), function(el){ return el.offsetParent !== null; }); }
function focusNext(el){
  var l = navOrder(), i = l.indexOf(el);
  var n = l[i + 1];
  if (n){ n.focus(); try{ n.select(); }catch(_){} } else el.blur();
}
$('dayBody').addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.keyCode === 13) && !e.isComposing && e.target.tagName === 'INPUT'){ e.preventDefault(); flushSave(); saveNow(); focusNext(e.target); }
});
$('dayBody').addEventListener('input', function(e){
  var el = e.target, f = el.getAttribute('data-f');
  if (f){
    var d = F[f], v = el.value, c;
    if (d.t === 'hm'){
      var dg = v.replace(/\D/g, '').slice(0, 4);
      c = dg.length >= 3 ? dg.slice(0, -2) + ':' + dg.slice(-2) : dg;
    } else c = v.replace(d.neg ? /[^\d.,\-−]/g : /[^\d.,]/g, '');
    if (c !== v) el.value = c;
    el.classList.remove('bad');
  } else if (el.classList.contains('sm')){ var c2 = el.value.replace(/\D/g, ''); if (c2 !== el.value) el.value = c2; }
  updateComputed(); scheduleSave();
});
$('dayBody').addEventListener('change', function(){ saveNow(); updateComputed(); });
$('dayBody').addEventListener('focusout', function(e){
  var f = e.target.getAttribute && e.target.getAttribute('data-f');
  if (f){ var p = parseField(f, e.target.value); if (p.ok && p.v != null) e.target.value = fmtField(f, p.v); e.target.classList.toggle('bad', !p.ok); }
  if (saveTimer) saveNow();
});
$('dayBody').addEventListener('focusin', function(e){
  var el = e.target; if (el.tagName !== 'INPUT') return;
  var v0 = el.value; if (!v0) return;
  setTimeout(function(){ if (el.value === v0 && document.activeElement === el){ try{ el.setSelectionRange(0, v0.length); }catch(_){} } }, 0);
});
$('formSign').addEventListener('mousedown', function(e){ e.preventDefault(); });
$('formSign').addEventListener('click', function(){
  var el = inputs.form, v = el.value.trim();
  if (!v || v === '-'){ el.value = v === '-' ? '' : '-'; el.focus(); return; }
  el.value = v.charAt(0) === '-' || v.charAt(0) === '−' ? v.slice(1) : '-' + v;
  updateComputed(); saveNow();
});
function growNote(){ noteIn.style.height = 'auto'; noteIn.style.height = Math.max(52, noteIn.scrollHeight + 4) + 'px'; }
noteIn.addEventListener('input', growNote);
// Sport
$('sportChips').addEventListener('mousedown', function(e){ if (e.target.closest('.chip')) e.preventDefault(); });
$('sportChips').addEventListener('click', function(e){
  var b = e.target.closest('[data-sp]'); if (!b) return;
  var t = b.getAttribute('data-sp'), list = readSport();
  var box = $('sportRows'); box.insertAdjacentHTML('beforeend', sportRowsHTML([{ t: t, m: null }]));
  var row = box.lastElementChild;
  row.setAttribute('data-i', list.length);
  (t ? row.querySelector('.sm') : row.querySelector('.st')).focus();
  updateComputed();
});
$('sportRows').addEventListener('click', function(e){
  var x = e.target.closest('.x'); if (!x) return;
  x.closest('.srow').remove(); updateComputed(); saveNow();
});

// ---------- Diagramme ----------
var chSec = 'bp', chRange = 30, charts = [];
function rangeKeys(){
  var all = Object.keys(days).sort(), end = todayKey();
  if (all.length && all[all.length - 1] > end) end = all[all.length - 1];
  var start = chRange === 'all' ? (all[0] && all[0] < end ? all[0] : end) : addDays(end, -(chRange - 1));
  var keys = [], k = start, guard = 0;
  while (k <= end && guard++ < 20000){ keys.push(k); k = addDays(k, 1); }
  return keys;
}
function series(keys, fn){ return keys.map(function(k){ var r = days[k]; if (!r) return null; var v = fn(r, k); return v == null || isNaN(v) ? null : v; }); }
function fld(name){ return function(r){ return r[name]; }; }
function any(arr){ return arr.some(function(v){ return v != null; }); }
function destroyCharts(){ charts.forEach(function(c){ try{ c.destroy(); }catch(e){} }); charts = []; }
function baseOpts(keys, o){
  o = o || {};
  var opt = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 10, usePointStyle: false } },
      tooltip: { callbacks: {
        title: function(it){ return it.length ? wdShort(keys[it[0].dataIndex]) + ' ' + fmtDate(keys[it[0].dataIndex]) : ''; },
        label: function(c){ var v = c.raw; if (v == null) return null; var f = c.dataset.fmt; return c.dataset.label + ': ' + (f ? f(v) : numG(v, c.dataset.dec || 0)); }
      } }
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { display: false } },
      y: { beginAtZero: !!o.zero, ticks: { callback: function(v){ return o.yfmt ? o.yfmt(v) : numG(v, o.ydec || 0); } } }
    },
    onClick: function(e, els, chart){
      var p = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, false);
      if (p.length) openDayFromChart(keys[p[0].index]);
    }
  };
  if (o.stacked){ opt.scales.x.stacked = true; opt.scales.y.stacked = true; }
  if (o.y1) opt.scales.y1 = { position: 'right', beginAtZero: !!o.y1.zero, grid: { drawOnChartArea: false }, ticks: { color: o.y1.color, callback: function(v){ return o.y1.fmt ? o.y1.fmt(v) : numG(v, o.y1.dec || 0); } } };
  if (o.zeroLine) opt.scales.y.grid = { color: function(c){ return c.tick && c.tick.value === 0 ? '#6b7785' : '#2a323c'; }, lineWidth: function(c){ return c.tick && c.tick.value === 0 ? 2 : 1; } };
  return opt;
}
function line(label, data, color, extra){
  var n = data.length, pr = n <= 31 ? 3 : n <= 92 ? 2 : 0;
  return Object.assign({ type: 'line', label: label, data: data, borderColor: color, backgroundColor: color, borderWidth: 2.5, pointRadius: pr, pointHoverRadius: 6, pointHitRadius: 8, spanGaps: true, tension: 0.25, order: 0 }, extra || {});
}
function bar(label, data, color, extra){ return Object.assign({ type: 'bar', label: label, data: data, backgroundColor: color, borderRadius: 3, maxBarThickness: 26, order: 1 }, extra || {}); }
function card(id, title, sum, tall){ return '<div class="chc"><h3>' + esc(title) + '</h3><div class="sum">' + sum + '</div><div class="cw' + (tall ? ' tall' : '') + '"><canvas id="' + id + '"></canvas></div></div>'; }
function emptyCard(title){ return '<div class="chc"><h3>' + esc(title) + '</h3><p class="empty">Keine Werte in diesem Zeitraum.</p></div>'; }
function mk(id, keys, datasets, o){
  var el = $(id); if (!el) return;
  var c = new Chart(el, { data: { labels: keys.map(fmtShort), datasets: datasets }, options: baseOpts(keys, o) });
  charts.push(c);
}
function b(v){ return '<b>' + v + '</b>'; }
function renderCharts(){
  destroyCharts();
  Array.prototype.forEach.call(document.querySelectorAll('#chSec button'), function(x){ x.className = x.getAttribute('data-s') === chSec ? 'on' : ''; });
  Array.prototype.forEach.call(document.querySelectorAll('#chRange button'), function(x){ x.className = x.getAttribute('data-r') === String(chRange) ? 'on' : ''; });
  var body = $('chBody');
  if (typeof Chart === 'undefined'){ body.innerHTML = '<p class="empty">Diagramm-Modul konnte nicht geladen werden. Bitte App einmal mit Internet öffnen.</p>'; return; }
  var keys = rangeKeys(), h = '', todo = [];
  var RED = '#ff6482', BLUE = '#4da3ff', GREEN = '#30d158', ORANGE = '#ff9f0a', PURPLE = '#bf5af2', YELLOW = '#ffd60a', CYAN = '#64d2ff';
  if (chSec === 'bp'){
    var mS = series(keys, fld('mS')), mD = series(keys, fld('mD')), aS = series(keys, fld('aS')), aD = series(keys, fld('aD')), mP = series(keys, fld('mP')), aP = series(keys, fld('aP'));
    if (any(mS) || any(mD) || any(aS) || any(aD)){
      var am = avg(mS), amd = avg(mD), aa = avg(aS), aad = avg(aD);
      h += card('ch1', 'Blutdruck (mmHg)', 'Ø morgens ' + b(am == null ? '–' : numG(am) + '/' + numG(amd)) + ' · Ø abends ' + b(aa == null ? '–' : numG(aa) + '/' + numG(aad)), true);
      todo.push(['ch1', [line('Sys morgens', mS, RED), line('Dia morgens', mD, BLUE), line('Sys abends', aS, '#ffb3c1', { borderDash: [6, 4], pointStyle: 'rectRot' }), line('Dia abends', aD, '#a8d1ff', { borderDash: [6, 4], pointStyle: 'rectRot' })], {}]);
    } else h += emptyCard('Blutdruck');
    if (any(mP) || any(aP)){
      h += card('ch2', 'Puls (Schläge/Min)', 'Ø morgens ' + b(numG(avg(mP))) + ' · Ø abends ' + b(numG(avg(aP))));
      todo.push(['ch2', [line('Puls morgens', mP, ORANGE), line('Puls abends', aP, YELLOW, { borderDash: [6, 4] })], {}]);
    } else h += emptyCard('Puls');
  } else if (chSec === 'w'){
    var W = series(keys, fld('w'));
    if (any(W)){
      var avg7 = keys.map(function(k){ var a = []; for (var i = 0; i < 7; i++){ var r = days[addDays(k, -i)]; if (r && r.w != null) a.push(r.w); } return a.length ? round1(avg(a)) : null; });
      var BMI = W.map(function(w){ return bmiOf(w); });
      var wv = W.filter(function(x){ return x != null; }), last = wv[wv.length - 1], first = wv[0];
      h += card('ch1', 'Gewicht (kg) & BMI', 'Aktuell ' + b(numG(last, 1) + ' kg') + ' · BMI ' + b(numG(bmiOf(last), 1)) + ' · Zeitraum ' + b(signed(round1(last - first), 1) + ' kg'), true);
      todo.push(['ch1', [line('Gewicht', W, GREEN, { dec: 1, fmt: function(v){ return numG(v, 1) + ' kg'; } }), line('7-Tage-Schnitt', avg7, YELLOW, { pointRadius: 0, borderWidth: 2, dec: 1 }), line('BMI', BMI, PURPLE, { yAxisID: 'y1', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, dec: 1 })], { ydec: 1, y1: { color: PURPLE, dec: 1 } }]);
    } else h += emptyCard('Gewicht');
  } else if (chSec === 'act'){
    var St = series(keys, fld('steps')), P = series(keys, fld('pai'));
    if (any(St) || any(P)){
      var pv = P.filter(function(x){ return x != null; });
      h += card('ch1', 'Schritte & PAI', 'Ø ' + b(numG(avg(St))) + ' Schritte · PAI zuletzt ' + b(pv.length ? numG(pv[pv.length - 1]) : '–'));
      todo.push(['ch1', [bar('Schritte', St, '#2f6fb3'), line('PAI', P, ORANGE, { yAxisID: 'y1' })], { zero: true, y1: { color: ORANGE, zero: true } }]);
    } else h += emptyCard('Schritte & PAI');
    var types = [], tm = {};
    keys.forEach(function(k){ (days[k] && days[k].sport || []).forEach(function(s){ var t = s.t || 'Sport'; if (!(t in tm)){ tm[t] = 0; types.push(t); } tm[t] += s.m || 0; }); });
    if (types.length){
      types.sort(function(a, c){ var ia = settings.sports.indexOf(a), ic = settings.sports.indexOf(c); return (ia < 0 ? 99 : ia) - (ic < 0 ? 99 : ic); });
      var total = types.reduce(function(s, t){ return s + tm[t]; }, 0), units = keys.reduce(function(s, k){ return s + (days[k] && days[k].sport ? days[k].sport.length : 0); }, 0);
      h += card('ch2', 'Sport (Minuten pro Tag)', 'Gesamt ' + b(numG(total) + ' min') + ' · ' + units + ' Einheiten · ' + types.map(function(t){ return esc(t) + ' ' + tm[t]; }).join(', '), true);
      todo.push(['ch2', types.map(function(t, i){
        return bar(t, series(keys, function(r){ var m = 0, f = false; (r.sport || []).forEach(function(s){ if ((s.t || 'Sport') === t){ m += s.m || 0; f = true; } }); return f ? m : null; }), PALETTE[i % PALETTE.length], { fmt: function(v){ return v + ' min'; } });
      }), { stacked: true, zero: true }]);
    } else h += emptyCard('Sport');
  } else if (chSec === 'kcal'){
    var KO = series(keys, fld('kOut')), KI = series(keys, fld('kIn')), DF = series(keys, deficit);
    if (any(KO) || any(KI)){
      var sumD = DF.reduce(function(s, x){ return s + (x || 0); }, 0);
      h += card('ch1', 'Kalorien (kcal)', 'Ø Verbrauch ' + b(numG(avg(KO))) + ' · Ø Aufnahme ' + b(numG(avg(KI))) + '<br>Ø Defizit ' + b(numG(avg(DF))) + ' · Summe ' + b(numG(sumD)) + ' kcal ≈ ' + b(numG(sumD / 7000, 1) + ' kg'), true);
      todo.push(['ch1', [line('Verbrauch', KO, ORANGE), line('Aufnahme', KI, BLUE), bar('Defizit', DF, function(c){ return c.raw != null && c.raw < 0 ? '#ff453a' : '#2fae55'; })], { zero: true }]);
    } else h += emptyCard('Kalorien');
  } else if (chSec === 'load'){
    var FO = series(keys, fld('form')), IS = series(keys, fld('ist')), SO = series(keys, fld('soll'));
    if (any(FO)){
      var fv = FO.filter(function(x){ return x != null; });
      h += card('ch1', 'Trainings-Form', 'Aktuell ' + b(fv.length ? signed(fv[fv.length - 1]).replace('±', '') : '–') + ' · Ø ' + b(numG(avg(FO))));
      todo.push(['ch1', [line('Trainings-Form', FO, CYAN, { fill: { target: { value: 0 }, above: 'rgba(48,209,88,.18)', below: 'rgba(255,69,58,.18)' } })], { zeroLine: true }]);
    } else h += emptyCard('Trainings-Form');
    if (any(IS) || any(SO)){
      h += card('ch2', 'Belastung IST / SOLL', 'Ø IST ' + b(numG(avg(IS))) + ' · Ø SOLL ' + b(numG(avg(SO))));
      todo.push(['ch2', [bar('IST', IS, '#7d5bd6'), line('SOLL', SO, YELLOW, { borderDash: [6, 4] })], { zero: true }]);
    } else h += emptyCard('Belastung');
  } else if (chSec === 'sleep'){
    var SL = series(keys, function(r){ return r.sleep == null ? null : round1(r.sleep / 60 * 10) / 10; }), AP = series(keys, fld('apnoe'));
    var SLm = series(keys, fld('sleep'));
    if (any(SL) || any(AP)){
      h += card('ch1', 'Schlaf', 'Ø Dauer ' + b(any(SLm) ? hm(avg(SLm)) + ' Std' : '–') + ' · Ø Schlafapnoe ' + b(numG(avg(AP), 1)), true);
      todo.push(['ch1', [bar('Schlafdauer (Std)', SL, '#3b5f8f', { fmt: function(v){ return hm(v * 60) + ' Std'; } }), line('Schlafapnoe', AP, RED, { yAxisID: 'y1', dec: 1 })], { zero: true, yfmt: function(v){ return v + ' h'; }, y1: { color: RED, zero: true, dec: 0 } }]);
    } else h += emptyCard('Schlaf');
  }
  body.innerHTML = h;
  todo.forEach(function(t){ mk(t[0], keys, t[1], t[2]); });
}
$('chSec').addEventListener('click', function(e){ var x = e.target.closest('[data-s]'); if (!x) return; chSec = x.getAttribute('data-s'); renderCharts(); });
$('chRange').addEventListener('click', function(e){ var x = e.target.closest('[data-r]'); if (!x) return; var r = x.getAttribute('data-r'); chRange = r === 'all' ? 'all' : +r; renderCharts(); });
if (typeof Chart !== 'undefined'){
  Chart.defaults.color = '#94a0ad';
  Chart.defaults.borderColor = '#2a323c';
  Chart.defaults.font.family = 'system-ui,-apple-system,Roboto,"Segoe UI",sans-serif';
  Chart.defaults.font.size = 12;
}

// ---------- Mehr ----------
function renderMore(){
  $('height').value = settings.height ? String(settings.height) : '';
  renderHeightInfo();
  $('sportEdit').innerHTML = settings.sports.map(function(s, i){
    return '<li data-i="' + i + '"><input type="text" value="' + esc(s) + '" data-a="name" aria-label="Name" enterkeyhint="done">'
      + '<button type="button" class="mb" data-a="up" aria-label="Nach oben"' + (i === 0 ? ' disabled' : '') + '>↑</button>'
      + '<button type="button" class="mb" data-a="down" aria-label="Nach unten"' + (i === settings.sports.length - 1 ? ' disabled' : '') + '>↓</button>'
      + '<button type="button" class="mb del" data-a="del" aria-label="Löschen">🗑</button></li>';
  }).join('');
  renderStats();
}
function renderHeightInfo(){
  var last = null; Object.keys(days).sort().forEach(function(k){ if (days[k].w != null) last = days[k].w; });
  $('heightInfo').textContent = last != null ? 'BMI bei ' + num(last, 1) + ' kg: ' + num(bmiOf(last), 1) : '';
}
$('height').addEventListener('input', function(){ var c = this.value.replace(/\D/g, '').slice(0, 3); if (c !== this.value) this.value = c; });
$('height').addEventListener('change', function(){
  var v = parseInt(this.value, 10);
  if (!(v >= 100 && v <= 250)){ toast('Bitte Größe in cm eingeben (100–250)', null, true); this.value = settings.height; return; }
  settings.height = v; settings.heightSet = true; saveSettings(); renderHeightInfo(); updateComputed(); toast('✓ Größe ' + v + ' cm gespeichert');
});
$('height').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); this.blur(); } });
function sportsChanged(){ saveSettings(); renderMore(); renderSportChips(); }
$('sportEdit').addEventListener('click', function(e){
  var x = e.target.closest('button[data-a]'); if (!x) return;
  var i = +x.closest('li').getAttribute('data-i'), a = x.getAttribute('data-a'), s = settings.sports;
  if (a === 'up' && i > 0){ s.splice(i - 1, 0, s.splice(i, 1)[0]); sportsChanged(); }
  else if (a === 'down' && i < s.length - 1){ s.splice(i + 1, 0, s.splice(i, 1)[0]); sportsChanged(); }
  else if (a === 'del'){ if (!window.confirm('„' + s[i] + '“ aus der Schnellauswahl entfernen?\n(Bereits eingetragene Tage bleiben unverändert.)')) return; s.splice(i, 1); sportsChanged(); }
});
$('sportEdit').addEventListener('change', function(e){
  var inp = e.target; if (inp.getAttribute('data-a') !== 'name') return;
  var i = +inp.closest('li').getAttribute('data-i'), v = inp.value.trim();
  if (!v){ inp.value = settings.sports[i]; return; }
  settings.sports[i] = v; sportsChanged();
});
$('sportEdit').addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ e.preventDefault(); e.target.blur(); } });
function addSport(){
  var v = $('newSport').value.trim(); if (!v){ $('newSport').focus(); return; }
  if (settings.sports.some(function(x){ return x.toLowerCase() === v.toLowerCase(); })){ toast('„' + v + '“ gibt es schon', null, true); return; }
  settings.sports.push(v); $('newSport').value = ''; sportsChanged(); toast('✓ „' + v + '“ hinzugefügt');
}
$('addSport').addEventListener('click', addSport);
$('newSport').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); addSport(); } });

// ---------- Export ----------
var COLS = ['Datum','Blutdruck Morgens Sys','Blutdruck Morgens Dia','Blutdruck Morgens Puls','Blutdruck Abends Sys','Blutdruck Abends Dia','Blutdruck Abends Puls',
  'Sonstiges','Gewicht','BMI','Wochen-Tendenz','Monats-Tendenz','Sport','Sport Minuten','Schritte','PAI','Kalorien Verbrauch','Kalorien Aufnahme','Kalorien Defizit',
  'Trainings-Form','Belastung IST','Belastung SOLL','Schlafdauer','Schlafapnoe'];
function csvCell(v, text){
  v = String(v == null ? '' : v);
  if (text && /^[=+@\-]/.test(v)) v = "'" + v;
  return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function toCSV(){
  var rows = [COLS.map(function(c){ return csvCell(c); }).join(';')];
  Object.keys(days).sort().forEach(function(k){
    var r = days[k];
    rows.push([fmtDate(k), num(r.mS), num(r.mD), num(r.mP), num(r.aS), num(r.aD), num(r.aP), csvCell(r.note, true),
      num(r.w, 1), num(bmiOf(r.w), 1), num(trend(k, r.w, 7, 3), 1), num(trend(k, r.w, 30, 7), 1),
      csvCell(sportText(r), true), r.sport ? num(sportMin(r)) : '', num(r.steps), num(r.pai), num(r.kOut), num(r.kIn), num(deficit(r)),
      num(r.form), num(r.ist), num(r.soll), r.sleep != null ? hm(r.sleep, true) : '', num(r.apnoe, 1)].join(';'));
  });
  return '\ufeff' + rows.join('\r\n') + '\r\n';
}
function toJSON(){
  return JSON.stringify({ app: 'tageswerte', version: VERSION, exported: new Date().toISOString(),
    settings: { height: settings.height, sports: settings.sports },
    days: Object.keys(days).sort().map(function(k){ return days[k]; }) });
}
function stamp(){ return todayKey(); }
function download(name, data, type){
  var blob = new Blob([data], { type: type }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
$('expCsv').addEventListener('click', function(){ flushSave(); download('tageswerte-' + stamp() + '.csv', toCSV(), 'text/csv;charset=utf-8'); });
$('expJson').addEventListener('click', function(){ flushSave(); download('tageswerte-sicherung-' + stamp() + '.json', toJSON(), 'application/json'); });
if (navigator.canShare && typeof File === 'function'){
  try{ if (navigator.canShare({ files: [new File(['x'], 't.json', { type: 'application/json' })] })) $('shareJson').style.display = ''; }catch(e){}
}
$('shareJson').addEventListener('click', function(){
  var f = new File([toJSON()], 'tageswerte-sicherung-' + stamp() + '.json', { type: 'application/json' });
  navigator.share({ files: [f], title: 'Tageswerte Sicherung' }).catch(function(){});
});

// ---------- Import ----------
function parseCSV(text){
  text = text.replace(/^\ufeff/, '');
  var first = text.split(/\r?\n/)[0];
  var sep = first.indexOf(';') >= 0 ? ';' : first.indexOf('\t') >= 0 ? '\t' : ',';
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++){
    var c = text[i];
    if (q){ if (c === '"'){ if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep){ row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r'){ if (c === '\r' && text[i+1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(x){ return x.trim() !== ''; }); });
}
function parseDate(s){
  s = String(s || '').trim();
  var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/);
  if (m){ var y = m[3] ? +m[3] : new Date().getFullYear(); if (y < 100) y += 2000; var d = new Date(y, +m[2] - 1, +m[1]); return d.getMonth() === +m[2] - 1 ? dayKey(d) : null; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m){ var d2 = new Date(+m[1], +m[2] - 1, +m[3]); return d2.getMonth() === +m[2] - 1 ? dayKey(d2) : null; }
  return null;
}
function tokens(s){
  return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}
function classify(name, taken){
  var T = tokens(name); if (!T.length) return null;
  var has = function(){ for (var i = 0; i < arguments.length; i++){ var a = arguments[i]; if (T.some(function(t){ return t.indexOf(a) === 0; })) return true; } return false; };
  var is = function(){ for (var i = 0; i < arguments.length; i++) if (T.indexOf(arguments[i]) >= 0) return true; return false; };
  if (has('datum') || is('date', 'tag')) return 'd';
  if (T.some(function(t){ return /apno|apnea/.test(t); })) return 'apnoe';
  if (has('schlaf', 'sleep')) return 'sleep';
  if (has('bmi', 'tendenz', 'defizit', 'trend')) return null;
  if (has('sys', 'puls', 'pulse') || is('dia', 'die') || has('diast')){
    var kind = has('sys') ? 'S' : has('puls', 'pulse') ? 'P' : 'D';
    var part = has('abend', 'evening') ? 'a' : has('morg', 'morning') ? 'm' : (taken['m' + kind] ? 'a' : 'm');
    return part + kind;
  }
  if (has('gewicht', 'weight') || is('kg')) return 'w';
  if (has('verbrauch')) return 'kOut';
  if (has('aufnahme')) return 'kIn';
  if (has('schritt', 'steps')) return 'steps';
  if (is('pai')) return 'pai';
  if (has('form')) return 'form';
  if (is('ist')) return 'ist';
  if (is('soll')) return 'soll';
  if (has('sport', 'training', 'aktivitaet')){ return has('min') ? 'sportMin' : 'sport'; }
  if (is('art')) return 'sport';
  if (has('min')) return 'sportMin';
  if (has('sonst', 'notiz', 'bemerk', 'note', 'kommentar', 'anmerk')) return 'note';
  return null;
}
function parseSport(txt, minTxt){
  var parts = String(txt || '').split(/\s*[;\n\r,]+\s*/).map(function(x){ return x.trim(); }).filter(Boolean);
  var mins = String(minTxt || '').split(/\s*[;\n\r]+\s*/).map(function(x){ return x.trim(); }).filter(Boolean);
  var out = parts.map(function(p, i){
    var m = p.match(/^(.*?)[\s:]*(\d+)\s*(min\.?|minuten)?$/i);
    if (m && m[1]) return { t: m[1].trim(), m: +m[2] };
    var mm = mins.length === parts.length ? parseNumber(mins[i], true) : null;
    return { t: p, m: mm != null && !isNaN(mm) ? Math.round(mm) : null };
  });
  if (!parts.length && mins.length){ var tot = mins.reduce(function(s, x){ var v = parseNumber(x, true); return s + (v > 0 ? v : 0); }, 0); if (tot) out.push({ t: 'Sport', m: tot }); }
  return out.filter(function(s){ return s.t; });
}
function csvToDays(text){
  var rows = parseCSV(text); if (!rows.length) throw new Error('Datei ist leer');
  var hi = -1;
  for (var i = 0; i < Math.min(rows.length, 15); i++){ if (rows[i].some(function(c){ return classify(c, {}) === 'd'; })){ hi = i; break; } }
  if (hi < 0) throw new Error('Spalte „Datum“ nicht gefunden');
  var h1 = rows[hi], h2 = null, start = hi + 1;
  var di = h1.findIndex(function(c){ return classify(c, {}) === 'd'; });
  if (rows[hi + 1] && !parseDate(rows[hi + 1][di]) && rows[hi + 1].some(function(c){ return c.trim(); })){ h2 = rows[hi + 1]; start = hi + 2; }
  var n = Math.max(h1.length, h2 ? h2.length : 0), map = {}, taken = {}, grp = '';
  for (var c = 0; c < n; c++){
    var a = (h1[c] || '').trim(), s = h2 ? (h2[c] || '').trim() : '';
    if (a) grp = a;
    var name = h2 ? (a ? a + ' ' + s : (s ? grp + ' ' + s : '')) : a;
    var k = classify(name, taken);
    if (k && !taken[k]){ taken[k] = true; map[k] = c; }
  }
  if (map.d == null) throw new Error('Spalte „Datum“ nicht gefunden');
  var list = [], future = 0, tk = todayKey();
  rows.slice(start).forEach(function(r){
    var d = parseDate(r[map.d]); if (!d) return;
    if (d > tk){ future++; return; }
    var rec = { d: d };
    NUMKEYS.forEach(function(k){ if (map[k] == null) return; var p = parseField(k, r[map[k]]); if (p.ok && p.v != null) rec[k] = p.v; });
    if (map.note != null){ var nt = (r[map.note] || '').replace(/^'/, '').trim(); if (nt) rec.note = nt; }
    if (map.sport != null || map.sportMin != null){ var sp = parseSport(map.sport != null ? (r[map.sport] || '').replace(/^'/, '') : '', map.sportMin != null ? r[map.sportMin] : ''); if (sp.length) rec.sport = sp; }
    if (!isEmptyRec(rec)) list.push(rec);
  });
  return { days: list, future: future };
}
function cleanRec(x){
  if (!x || typeof x !== 'object') return null;
  var d = typeof x.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.d) ? x.d : parseDate(x.d || x.datum);
  if (!d) return null;
  var r = { d: d };
  NUMKEYS.forEach(function(k){
    var v = x[k]; if (v == null || v === '') return;
    var p = typeof v === 'number' ? (v >= F[k].min && v <= F[k].max ? { ok: true, v: F[k].t === 'dec' ? round1(v) : Math.round(v) } : { ok: false }) : parseField(k, v);
    if (p.ok && p.v != null) r[k] = p.v;
  });
  if (x.note && String(x.note).trim()) r.note = String(x.note).trim();
  if (Array.isArray(x.sport)){
    var sp = x.sport.filter(function(s){ return s && (s.t || s.m != null); }).map(function(s){ var m = s.m == null || s.m === '' ? null : Math.round(+s.m); return { t: String(s.t || 'Sport').trim(), m: isNaN(m) ? null : m }; });
    if (sp.length) r.sport = sp;
  } else if (typeof x.sport === 'string'){ var sp2 = parseSport(x.sport); if (sp2.length) r.sport = sp2; }
  if (x.created) r.created = String(x.created);
  if (x.updated) r.updated = String(x.updated);
  return isEmptyRec(r) ? null : r;
}
// Zusammenführen nach Datum: vorhandene Werte bleiben, leere Felder werden ergänzt, Sport ohne Dubletten
function mergeDays(list){
  var A = {}, U = {}, S = {}, writes = [];
  list.forEach(function(x){
    var r = cleanRec(x); if (!r) return;
    var ex = days[r.d];
    if (!ex){ r.created = r.created || new Date().toISOString(); r.updated = r.updated || new Date().toISOString(); days[r.d] = r; writes.push(r); A[r.d] = 1; return; }
    var ch = false;
    NUMKEYS.forEach(function(k){ if (ex[k] == null && r[k] != null){ ex[k] = r[k]; ch = true; } });
    if (!ex.note && r.note){ ex.note = r.note; ch = true; }
    if (r.sport){
      ex.sport = ex.sport || [];
      r.sport.forEach(function(s){ if (!ex.sport.some(function(e){ return e.t.toLowerCase() === s.t.toLowerCase() && e.m === s.m; })){ ex.sport.push(s); ch = true; } });
      if (!ex.sport.length) delete ex.sport;
    }
    if (ch){ ex.updated = new Date().toISOString(); if (writes.indexOf(ex) < 0) writes.push(ex); if (!A[r.d]){ U[r.d] = 1; delete S[r.d]; } }
    else if (!A[r.d] && !U[r.d]) S[r.d] = 1;
  });
  var add = Object.keys(A).length, upd = Object.keys(U).length, same = Object.keys(S).length;
  // neue Sportarten in die Auswahl
  var ns = 0;
  writes.forEach(function(r){ (r.sport || []).forEach(function(s){ if (s.t && s.t !== 'Sport' && !settings.sports.some(function(x){ return x.toLowerCase() === s.t.toLowerCase(); })){ settings.sports.push(s.t); ns++; } }); });
  if (ns) saveSettings();
  return (writes.length ? putDays(writes) : Promise.resolve()).then(function(){ return { added: add, updated: upd, same: same, sports: ns }; });
}
function importText(text){
  text = String(text).replace(/^\ufeff/, '');
  return ready.then(function(){
    flushSave();
    var list, extra = {};
    if (/^\s*[\{\[]/.test(text)){
      var data = JSON.parse(text);
      if (Array.isArray(data)) data = { days: data };
      if (!Array.isArray(data.days)) throw new Error('Keine Tageswerte in der Datei');
      list = data.days;
      if (data.settings){
        if (Array.isArray(data.settings.sports)) data.settings.sports.forEach(function(s){ if (s && !settings.sports.some(function(x){ return x.toLowerCase() === String(s).toLowerCase(); })) settings.sports.push(String(s)); });
        var hh = +data.settings.height; if (!settings.heightSet && hh >= 100 && hh <= 250){ settings.height = hh; }
        saveSettings();
      }
    } else { var c = csvToDays(text); list = c.days; extra.future = c.future; }
    return mergeDays(list).then(function(r){ r.future = extra.future || 0; r.rows = list.length; return r; });
  });
}
$('impBtn').addEventListener('click', function(){ $('impFile').value = ''; $('impFile').click(); });
$('impFile').addEventListener('change', function(){
  var f = this.files && this.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    importText(rd.result).then(function(r){
      var parts = [r.added + (r.added === 1 ? ' neuer Tag' : ' neue Tage')];
      if (r.updated) parts.push(r.updated + ' ergänzt');
      if (r.same) parts.push(r.same + ' schon vorhanden');
      if (r.future) parts.push(r.future + ' Zukunftszeilen übersprungen');
      toast('✓ Import: ' + parts.join(', '));
      loadDay(cur); renderMore(); renderSportChips();
    }).catch(function(e){ toast('Import fehlgeschlagen: ' + e.message, null, true); });
  };
  rd.readAsText(f);
});
$('wipe').addEventListener('click', function(){
  if (!window.confirm('Wirklich ALLE Tageswerte löschen?')) return;
  if (!window.confirm('Sicher? Das kann nicht rückgängig gemacht werden. Vorher Sicherung gemacht?')) return;
  clearTimeout(saveTimer); saveTimer = null;
  queue(function(){ return tx(['days'], 'readwrite', function(t){ t.objectStore('days').clear(); }); }).then(function(){
    days = {}; loadDay(cur); renderMore(); toast('Alle Tageswerte gelöscht');
  });
});
function renderStats(){
  var ks = Object.keys(days).sort();
  var s = ks.length ? ks.length + (ks.length === 1 ? ' Tag' : ' Tage') + ' mit Werten (' + fmtDate(ks[0]) + ' – ' + fmtDate(ks[ks.length - 1]) + ')' : 'Noch keine Werte eingetragen';
  $('stats').textContent = s + (persisted === true ? ' · Speicher dauerhaft geschützt' : '');
}

// ---------- Navigation (mit Android-Zurück-Taste) ----------
var curView = 'day', depth = 0;
function show(v){
  if (v !== 'day') flushSave();
  curView = v;
  Array.prototype.forEach.call(document.querySelectorAll('nav button'), function(x){ x.className = x.getAttribute('data-v') === v ? 'on' : ''; });
  $('v-day').className = 'view' + (v === 'day' ? ' on' : '');
  $('v-charts').className = 'view' + (v === 'charts' ? ' on' : '');
  $('v-more').className = 'view' + (v === 'more' ? ' on' : '');
  $('hdrDay').hidden = v !== 'day'; $('hdrOther').hidden = v === 'day';
  $('hdrTitle').textContent = v === 'charts' ? 'Diagramme' : 'Mehr';
  if (v === 'charts') renderCharts(); else destroyCharts();
  if (v === 'more') renderMore();
  if (v === 'day'){ renderHeader(); updateComputed(); }
  window.scrollTo(0, 0);
}
function go(v){
  if (v === curView) return;
  if (v === 'day'){ if (depth > 0){ history.go(-depth); return; } show('day'); return; }
  if (depth === 0){ depth = 1; history.pushState({ v: v, depth: 1 }, ''); } else history.replaceState({ v: v, depth: depth }, '');
  show(v);
}
function openDayFromChart(k){
  depth++; history.pushState({ v: 'day', depth: depth }, '');
  loadDay(k); show('day');
}
window.addEventListener('popstate', function(e){
  var s = e.state; depth = s && s.depth || 0;
  show(s && s.v || 'day');
});
Array.prototype.forEach.call(document.querySelectorAll('nav button'), function(x){
  x.addEventListener('click', function(){ go(x.getAttribute('data-v')); });
});
var hiddenAt = 0;
document.addEventListener('visibilitychange', function(){
  if (document.visibilityState === 'hidden'){ flushSave(); hiddenAt = Date.now(); return; }
  // nach längerer Pause wieder auf „Heute“
  if (hiddenAt && Date.now() - hiddenAt > 30 * 60000 && curView === 'day' && cur !== todayKey()) loadDay(todayKey());
  else if (curView === 'day') renderHeader();
});
window.addEventListener('pagehide', flushSave);

// ---------- Installation / Offline ----------
var deferred = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); deferred = e; $('installBtn').style.display = 'inline-block'; });
$('installBtn').addEventListener('click', function(){ if (deferred){ deferred.prompt(); deferred = null; $('installBtn').style.display = 'none'; } });
window.addEventListener('appinstalled', function(){ $('installBtn').style.display = 'none'; });
function busy(){ var a = document.activeElement; return !!(saveTimer || (a && /INPUT|TEXTAREA/.test(a.tagName))); }
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  var hadCtrl = !!navigator.serviceWorker.controller, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if (!hadCtrl || reloading){ hadCtrl = true; return; }
    if (!busy()){ flushSave(); reloading = true; location.reload(); }
    else $('updBar').className = 'on';
  });
  $('updBtn').addEventListener('click', function(){ flushSave(); reloading = true; location.reload(); });
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function(reg){
      document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') reg.update().catch(function(){}); });
    }).catch(function(){});
  });
}

// ---------- Start ----------
if (history.state) try{ history.replaceState(null, ''); }catch(e){}
renderSportChips(); loadDay(cur);
ready.then(function(){ renderSportChips(); if (!saveTimer) loadDay(cur); else { saveNow(); updateComputed(); } });

// für Tests
window.__tw = { version: VERSION, ready: function(){ return ready.then(function(){ return writeQ; }); }, days: function(){ return days; }, settings: function(){ return settings; },
  cur: function(){ return cur; }, toCSV: toCSV, toJSON: toJSON, importText: importText, parseHM: parseHM, parseNumber: parseNumber, bmi: bmiOf, flush: function(){ flushSave(); return writeQ; } };
})();
