(function(){
'use strict';
var VERSION = 2;
var $ = function(id){ return document.getElementById(id); };
var DEFAULT_SPORTS = ['Squash', 'Padel', 'Boxen', 'Crosstrainer', 'WellY-Kraft', 'Laufband'];
// Felder: t = int | dec | hm (Std:Min, gespeichert in Minuten)
var F = {
  // Blutdruck
  mS: { t: 'int', min: 40, max: 300 },  mD: { t: 'int', min: 20, max: 250 },  mP: { t: 'int', min: 20, max: 250 },
  aS: { t: 'int', min: 40, max: 300 },  aD: { t: 'int', min: 20, max: 250 },  aP: { t: 'int', min: 20, max: 250 },
  rhr: { t: 'int', min: 20, max: 250 }, hrAvg: { t: 'int', min: 20, max: 250 }, hrMax: { t: 'int', min: 20, max: 260 },
  dS: { t: 'int', min: 40, max: 300 },  dD: { t: 'int', min: 20, max: 250 },
  // Gewicht / Kalorien
  w: { t: 'dec', min: 20, max: 400 },
  kOut: { t: 'int', min: 0, max: 30000 }, kIn: { t: 'int', min: 0, max: 30000 }, kAct: { t: 'int', min: 0, max: 30000 },
  // Sport
  steps: { t: 'int', min: 0, max: 300000 }, pai: { t: 'int', min: 0, max: 5000 }, dist: { t: 'dec', min: 0, max: 1000 },
  form: { t: 'int', min: -999, max: 999, neg: true }, ist: { t: 'int', min: 0, max: 99999 }, soll: { t: 'int', min: 0, max: 99999 },
  // Schlaf / AirSense
  sleep: { t: 'hm', min: 0, max: 1440 }, apnoe: { t: 'dec', min: 0, max: 500 },
  ahi: { t: 'dec', min: 0, max: 200 }, use: { t: 'hm', min: 0, max: 1440 }, leak: { t: 'dec', min: 0, max: 300 }, leakT: { t: 'dec', min: 0, max: 100 },
  mask: { t: 'int', min: 0, max: 100 }, p95: { t: 'dec', min: 0, max: 30 }, pAvg: { t: 'dec', min: 0, max: 30 },
  hI: { t: 'dec', min: 0, max: 200 }, oaI: { t: 'dec', min: 0, max: 200 }, caI: { t: 'dec', min: 0, max: 200 }, aI: { t: 'dec', min: 0, max: 200 },
  resp: { t: 'dec', min: 0, max: 80 }, spo2: { t: 'dec', min: 50, max: 100 }, rr: { t: 'dec', min: 0, max: 80 },
  // Waage
  bmr: { t: 'int', min: 0, max: 9999 }, fatCtl: { t: 'dec', min: -200, max: 200, neg: true }, fat: { t: 'dec', min: 0, max: 100 }, musc: { t: 'dec', min: 0, max: 150 },
  visc: { t: 'dec', min: 0, max: 100 }, prot: { t: 'dec', min: 0, max: 100 }, water: { t: 'dec', min: 0, max: 100 }, mkg: { t: 'dec', min: 0, max: 200 },
  lgR: { t: 'dec', min: 0, max: 100 }, lgL: { t: 'dec', min: 0, max: 100 }, amR: { t: 'dec', min: 0, max: 100 }, amL: { t: 'dec', min: 0, max: 100 },
  // Körpermaße (cm)
  chest: { t: 'dec', min: 20, max: 300 }, waist: { t: 'dec', min: 20, max: 300 }, belly: { t: 'dec', min: 20, max: 300 }, hip: { t: 'dec', min: 20, max: 300 },
  shoulder: { t: 'dec', min: 20, max: 300 }, uaR: { t: 'dec', min: 5, max: 150 }, uaL: { t: 'dec', min: 5, max: 150 },
  thR: { t: 'dec', min: 10, max: 200 }, thL: { t: 'dec', min: 10, max: 200 }, neck: { t: 'dec', min: 10, max: 100 },
  clR: { t: 'dec', min: 10, max: 100 }, clL: { t: 'dec', min: 10, max: 100 }
};
var NUMKEYS = Object.keys(F);
var PALETTE = ['#30d158','#ff9f0a','#4da3ff','#ff6482','#bf5af2','#ffd60a','#64d2ff','#ff453a','#a2845e','#5e5ce6','#8e8e93','#66d4a0'];

var days = {};                 // 'YYYY-MM-DD' -> Datensatz
var settings = { height: 185, heightSet: false, sports: DEFAULT_SPORTS.slice(), hrMax: 172, hrMaxSet: false, birth: '', plan: [null, null, null, null, null, null, null] };
var labor = null;              // { items: [...], meds: [...] }
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
function saveLabor(){ var l = JSON.parse(JSON.stringify(labor)); return queue(function(){ return tx(['meta'], 'readwrite', function(t){ t.objectStore('meta').put(l, 'labor'); }); }); }
function validBirth(b){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || ''); if (!m) return false; var y = +m[1], mo = +m[2], d = +m[3], t = new Date(y, mo - 1, d); return y >= 1900 && t.getMonth() === mo - 1 && t.getDate() === d && t <= new Date(); }
function ageOf(b){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b), n = new Date(), a = n.getFullYear() - +m[1]; if (n.getMonth() + 1 < +m[2] || (n.getMonth() + 1 === +m[2] && n.getDate() < +m[3])) a--; return a; }
function hrMaxFromBirth(b){ return validBirth(b) ? Math.max(100, Math.min(230, 220 - ageOf(b))) : null; }
function fmtBirth(b){ return b ? b.slice(8) + '.' + b.slice(5, 7) + '.' + b.slice(0, 4) : ''; }
function normSettings(s){
  var pl = Array.isArray(s.plan) && s.plan.length === 7 ? s.plan.map(function(x){ return x == null || isNaN(+x) ? null : +x; }) : [null, null, null, null, null, null, null];
  return { height: +s.height || 185, heightSet: !!s.heightSet, sports: s.sports.slice(), hrMax: +s.hrMax >= 100 && +s.hrMax <= 230 ? +s.hrMax : 172, hrMaxSet: !!s.hrMaxSet, birth: validBirth(s.birth) ? s.birth : '', plan: pl };
}
var ready = idb().then(function(){
  return tx(['meta','days'], 'readonly', function(t){ return { s: t.objectStore('meta').get('settings'), l: t.objectStore('meta').get('labor'), d: t.objectStore('days').getAll() }; });
}).then(function(r){
  var s = r.s.result;
  if (s && Array.isArray(s.sports)) settings = normSettings(s);
  else saveSettings();
  var l = r.l.result; if (l && Array.isArray(l.items)) labor = l;
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

// ---------- Belastung ----------
var ZF = [1, 2, 3, 4, 5];   // Faktoren der Pulszonen: leicht, intensiv, aerob, anaerob, VO2max
function loadOfSession(s){
  var m = s && s.m > 0 ? s.m : 0, z = s && s.z;
  if (z && z.length === 5){
    var tot = 0, any = false; for (var i = 0; i < 5; i++){ if (z[i] > 0){ tot += z[i] * ZF[i]; any = true; } }
    if (any) return Math.round(tot);
  }
  if (!m) return 0;
  var f = 2;
  if (s.hr > 0){ var p = s.hr / (settings.hrMax || 172); f = p < 0.6 ? 1 : p < 0.7 ? 2 : p < 0.8 ? 3 : p < 0.9 ? 4 : 5; }
  else if (s.teA != null || s.teN != null) f = Math.min(5, 1 + Math.max(s.teA || 0, s.teN || 0));
  return Math.round(m * f);
}
function dayLoad(list){ return (list || []).reduce(function(s, x){ return s + loadOfSession(x); }, 0); }
function wdIdx(k){ return (kd(k).getDay() + 6) % 7; }
var WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function planFor(k){ var v = settings.plan[wdIdx(k)]; return v == null ? null : v; }
function sollFor(k){ var r = days[k]; return r && r.soll != null ? r.soll : planFor(k); }

// ---------- Tabs (Oberfläche) ----------
var TABS = [
  { id: 'bp', name: 'Blutdruck', ic: '🩺' }, { id: 'w', name: 'Gewicht', ic: '⚖️' }, { id: 'sp', name: 'Sport', ic: '🏋️' },
  { id: 'sl', name: 'Schlaf', ic: '😴' }, { id: 'sc', name: 'Waage', ic: '📊' }, { id: 'bm', name: 'Maße', ic: '📏' }
];
function fi(k, label, unit, ph){
  var t = F[k].t, mode = t === 'dec' ? 'decimal' : 'numeric';
  var inp = '<input class="num" data-f="' + k + '" id="f-' + k + '" type="text" inputmode="' + mode + '" enterkeyhint="next" autocomplete="off" placeholder="' + (ph || (t === 'hm' ? '0:00' : '–')) + '">';
  return '<div class="f"><label for="f-' + k + '">' + label + '</label>' + (unit ? '<div class="unitw" data-u="' + unit + '">' + inp + '</div>' : inp) + '</div>';
}
function cvh(id, label){ return '<div class="cv" id="' + id + '"><small>' + label + '</small><span>–</span></div>'; }
function crd(ic, title, body, extra){ return '<div class="card"><h3><span class="ic">' + ic + '</span>' + title + (extra || '') + '</h3>' + body + '</div>'; }
function grid(cls, items){ return '<div class="g ' + cls + '">' + items.join('') + '</div>'; }
function bi(k, aria){ return '<input class="num" data-f="' + k + '" id="f-' + k + '" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" placeholder="–" aria-label="' + aria + '">'; }
function bpRow(lbl, s, d, p){
  var l = lbl + ' ';
  return '<span class="rl">' + lbl + '</span>' + bi(s, l + 'systolisch') + bi(d, l + 'diastolisch') + bi(p, l + 'Puls');
}
var ENT = {
  bp: function(){
    return crd('🩺', 'Blutdruck', '<div class="g bp"><span></span><span class="ch">Sys</span><span class="ch">Dia</span><span class="ch">Puls</span>'
        + bpRow('Morgens', 'mS', 'mD', 'mP') + bpRow('Abends', 'aS', 'aD', 'aP') + '</div>')
      + crd('⌚', 'Uhr · Tageswerte', '<p class="sub">Tagesmittel aus dem Zepp-/Health-Import (zählt nicht als Messung am Gerät).</p>'
        + grid('g3', [fi('rhr', 'Ruhepuls'), fi('hrAvg', 'Puls Ø'), fi('hrMax', 'Puls max')])
        + '<div style="height:8px"></div>' + grid('g2', [fi('dS', 'Sys Ø Tag'), fi('dD', 'Dia Ø Tag')]));
  },
  w: function(){
    return crd('⚖️', 'Gewicht', '<div class="wrow"><div class="f"><label for="f-w">Gewicht</label><div class="unitw" data-u="kg"><input class="num" data-f="w" id="f-w" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="–"></div></div>' + cvh('c-bmi', 'BMI') + '</div>'
        + '<div class="g g2 tend">' + cvh('c-wk', 'Woche') + cvh('c-mo', 'Monat') + '</div>'
        + '<div class="g g2 tend">' + cvh('c-avg', 'Ø 7 Tage') + cvh('c-slope', 'Tendenz/Woche') + '</div>'
        + '<p class="sub" style="margin:8px 2px 0">Tendenz = Trend der letzten 14 Tage; im Diagramm als gleitender 7-Tage-Schnitt.</p>')
      + crd('🔥', 'Kalorien', grid('g2', [fi('kOut', 'Verbrauch', 'kcal'), fi('kIn', 'Aufnahme', 'kcal')])
        + '<div style="height:8px"></div>' + grid('g2', [fi('kAct', 'davon aktiv', 'kcal'), '<div class="f"><span class="fl">Defizit</span><div class="cv" id="c-def"><span>–</span></div></div>'])
        + '<p class="sub" style="margin:8px 2px 0">Aufnahme von Hand eintragen. Verbrauch kommt aus dem Uhr-Import oder von Hand.</p>');
  },
  sp: function(){
    return crd('🏋️', 'Sport', '<div id="sportRows"></div><div class="chips" id="sportChips"></div>', '<b id="c-sport"></b>')
      + crd('👟', 'Aktivität', grid('g3', [fi('steps', 'Schritte'), fi('pai', 'PAI'), fi('dist', 'Strecke', 'km')]))
      + crd('📊', 'Belastung', grid('g3', [
          '<div class="f"><label for="f-form">Form</label><div class="formRow"><button type="button" class="pm" id="formSign" aria-label="Vorzeichen umschalten">±</button><input class="num" data-f="form" id="f-form" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" placeholder="–"></div></div>',
          fi('ist', 'Ist'), fi('soll', 'Soll')])
        + '<p class="sub" id="sollInfo" style="margin:8px 2px 0"></p>'
        + '<button type="button" class="calc" id="calcIst">↻ Ist aus Sport berechnen</button>')
      + '<details id="planD"><summary>Wochenplan (Soll)</summary><p class="muted">Belastungs-Soll je Wochentag. Ist an einem Tag das Feld „Soll“ leer, gilt der Plan.</p><div class="planG" id="plan">'
        + WD.map(function(w, i){ return '<div><label>' + w + '</label><input class="num pl" data-wd="' + i + '" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" placeholder="–"></div>'; }).join('') + '</div></details>'
      + '<details id="formD"><summary>Wie wird die Belastung berechnet?</summary><p class="muted" style="margin:0">'
        + '<b>Ist</b> = Summe aller Einheiten des Tages (Methode nach Edwards): Minuten je Pulszone × Faktor – leicht ×1, intensiv ×2, aerob ×3, anaerob ×4, VO₂max ×5. '
        + 'Fehlen die Zonen, zählt Dauer × Faktor nach Ø-Puls (unter 60 % des Max-Pulses ×1, 60–70 % ×2, 70–80 % ×3, 80–90 % ×4, ab 90 % ×5). '
        + 'Ohne Puls: Dauer × (1 + Trainingseffekt), sonst Dauer × 2. Alltagsbewegung zählt nicht mit. '
        + '<b>Soll</b> = Wert im Feld oder der Wochenplan. Der Max-Puls steht unter ⚙.</p></details>';
  },
  sl: function(){
    return crd('😴', 'Schlaf', grid('g2', [fi('sleep', 'Dauer (Std:Min)'), fi('apnoe', 'Apnoe (Uhr-Schätzung)')]))
      + crd('😷', 'AirSense 10', grid('g2', [fi('ahi', 'AHI', '/h'), fi('use', 'Nutzung (Std:Min)')])
        + '<div style="height:8px"></div>' + grid('g2', [fi('leak', 'Maskenleckage', 'l/min'), fi('mask', 'Maskensitz-Score', 'von 100')]))
      + '<details id="airD"><summary>Weitere AirSense-Werte</summary>' + grid('g2', [fi('leakT', 'Zeit Leck %'), fi('resp', 'Atemfrequenz'), fi('p95', '95 %-Druck', 'hPa'), fi('pAvg', 'Ø-Druck', 'hPa'),
          fi('hI', 'Hypopnoe-Index'), fi('oaI', 'Obstr. Apnoe-Index'), fi('caI', 'Zentr. Apnoe-Index'), fi('aI', 'Apnoe-Index')]) + '</details>'
      + crd('🫁', 'Uhr · Sauerstoff & Atmung', grid('g2', [fi('spo2', 'SpO₂ Ø', '%'), fi('rr', 'Atemfrequenz Ø')]));
  },
  sc: function(){
    return crd('📊', 'Waage', '<div class="g g2">' + cvh('c-w2', 'Gewicht (kg)') + cvh('c-bmi2', 'BMI') + '</div><div style="height:8px"></div>'
        + grid('g2', [fi('fat', 'Fett', '%'), fi('musc', 'Muskelrate', '%'), fi('visc', 'Viszeralfett'), fi('water', 'Wasser', '%'),
          fi('prot', 'Eiweiß', '%'), fi('mkg', 'Muskeln', 'kg'), fi('bmr', 'Grundumsatz', 'kcal'), fi('fatCtl', 'Fettkontrolle', 'kg')])
        + '<p class="sub" style="margin:8px 2px 0">Gewicht und BMI sind im Tab „Gewicht“ eingetragen.</p>')
      + crd('💪', 'Muskeln je Körperteil', grid('g2', [fi('amR', 'Arm rechts', 'kg'), fi('amL', 'Arm links', 'kg'), fi('lgR', 'Bein rechts', 'kg'), fi('lgL', 'Bein links', 'kg')]));
  },
  bm: function(){
    return crd('📏', 'Rumpf', grid('g2', [fi('chest', 'Brust', 'cm'), fi('waist', 'Taille', 'cm'), fi('belly', 'Bauch', 'cm'), fi('hip', 'Hüfte', 'cm'), fi('shoulder', 'Schulter', 'cm'), '<div class="f"><span class="fl">Taille/Hüfte</span><div class="cv" id="c-whr"><span>–</span></div></div>']))
      + crd('💪', 'Arme, Beine, Hals', grid('g2', [fi('uaR', 'Oberarm re.', 'cm'), fi('uaL', 'Oberarm li.', 'cm'), fi('thR', 'Oberschenkel re.', 'cm'), fi('thL', 'Oberschenkel li.', 'cm'),
          fi('clR', 'Wade rechts', 'cm'), fi('clL', 'Wade links', 'cm'), fi('neck', 'Hals', 'cm')]));
  }
};
var tabKeys = { // Felder je Tab (für „hat Daten“)
  bp: ['mS','mD','mP','aS','aD','aP','rhr','hrAvg','hrMax','dS','dD'], w: ['w','kIn','kOut','kAct'],
  sp: ['steps','pai','dist','form','ist','soll'], sl: ['sleep','apnoe','ahi','use','leak','leakT','mask','p95','pAvg','hI','oaI','caI','aI','resp','spo2','rr'],
  sc: ['bmr','fatCtl','fat','musc','visc','prot','water','mkg','lgR','lgL','amR','amL'], bm: ['chest','waist','belly','hip','shoulder','uaR','uaL','thR','thL','neck','clR','clL']
};
var curTab = 'bp', ranges = { bp: 30, w: 90, sp: 30, sl: 30, sc: 'all', bm: 'all' }, vlN = {};
try{ var lt = localStorage.getItem('tw-tab'); if (lt && ENT[lt]) curTab = lt; }catch(e){}
(function build(){
  var h = '', nv = '';
  TABS.forEach(function(t){
    h += '<section class="view tab" id="v-' + t.id + '" data-t="' + t.id + '"><div class="ent">' + ENT[t.id]() + '</div>'
      + '<div class="vh"><h2>Verlauf</h2></div><div class="seg rng">'
      + '<button type="button" data-r="7">7 Tage</button><button type="button" data-r="30">30 Tage</button><button type="button" data-r="90">90 Tage</button><button type="button" data-r="all">Alle</button></div>'
      + '<div class="chs"></div><div class="vh"><h2>Letzte Einträge</h2></div><div class="vl"></div></section>';
    nv += '<button data-v="' + t.id + '" type="button"><i>' + t.ic + '</i>' + t.name + '</button>';
  });
  $('tabs').innerHTML = h; $('nav').innerHTML = nv;
})();

// ---------- Tag ----------
var cur = todayKey();
var inputs = {};
NUMKEYS.forEach(function(k){ inputs[k] = $('f-' + k); });
var noteIn = $('f-note');
var saveTimer = null;

function extrasOf(s){ var x = {}; ['st','hr','hrMax','kcal','teA','teN','z','src'].forEach(function(k){ if (s[k] != null) x[k] = s[k]; }); return x; }
function extrasText(s){
  var p = [];
  if (s.st) p.push(s.st + ' Uhr');
  if (s.hr) p.push('Ø ' + s.hr + (s.hrMax ? ' · max ' + s.hrMax : ''));
  if (s.teA != null || s.teN != null) p.push('TE ' + num(s.teA, 1) + '/' + num(s.teN, 1));
  if (s.kcal) p.push(s.kcal + ' kcal');
  if (s.z && s.z.length === 5) p.push('Zonen ' + s.z.join('/') + ' min');
  var l = loadOfSession(s); if (l) p.push('Belastung ' + l);
  return p.join(' · ');
}
function sportRowsHTML(list){
  return list.map(function(s, i){
    var x = extrasOf(s), has = Object.keys(x).length > 0, xt = has ? extrasText(s) : '';
    return '<div class="srow" data-i="' + i + '"' + (has ? ' data-x="' + esc(JSON.stringify(x)) + '"' : '') + '><input class="st" type="text" value="' + esc(s.t) + '" placeholder="Sportart" enterkeyhint="next" autocapitalize="words" aria-label="Sportart">'
      + '<input class="sm" type="text" inputmode="numeric" enterkeyhint="next" autocomplete="off" value="' + esc(s.m == null ? '' : s.m) + '" placeholder="–" aria-label="Minuten"><span class="u">min</span>'
      + '<button type="button" class="x" aria-label="Entfernen">✕</button>' + (xt ? '<div class="sx">' + esc(xt) + '</div>' : '') + '</div>';
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
    if (t || m != null){
      var o = { t: t || 'Sport', m: m == null ? null : Math.round(m) };
      var xs = r.getAttribute('data-x');
      if (xs){ try{ var x = JSON.parse(xs); Object.keys(x).forEach(function(k){ o[k] = x[k]; }); }catch(e){} }
      out.push(o);
    }
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
  if (prev && prev.auto){   // Herkunft „automatisch importiert“ nur behalten, solange der Wert unverändert ist
    var au = {}; Object.keys(prev.auto).forEach(function(k){ if (r[k] != null && r[k] === prev[k]) au[k] = 1; });
    if (Object.keys(au).length) r.auto = au;
  }
  return r;
}
function norm(o){
  if (Array.isArray(o)) return o.map(norm);
  if (o && typeof o === 'object'){ var x = {}; Object.keys(o).sort().forEach(function(k){ if (k !== 'updated' && k !== 'created') x[k] = norm(o[k]); }); return x; }
  return o;
}
function sameRec(a, b){ return JSON.stringify(norm(a || {})) === JSON.stringify(norm(b || {})); }
function addSportsFrom(list){
  var added = false;
  list.forEach(function(s){
    if (s.t && s.t !== 'Sport' && !settings.sports.some(function(x){ return x.toLowerCase() === s.t.toLowerCase(); })){ settings.sports.push(s.t); added = true; }
  });
  if (added){ saveSettings(); renderSportChips(); }
  return added;
}
var viewTimer = null;
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  var r = collect(), prev = days[cur];
  if (isEmptyRec(r)){
    if (!prev) return;
    delete days[cur]; delDay(cur); savedHint('✓ gespeichert (Tag leer)'); scheduleView(); return;
  }
  if (prev && sameRec(prev, r)) return;
  r.created = prev && prev.created || new Date().toISOString();
  r.updated = new Date().toISOString();
  days[cur] = r; putDays([r]); savedHint(); scheduleView();
  addSportsFrom(r.sport || []);   // neue Sportart automatisch in die Schnellauswahl
}
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 600); }
function flushSave(){ if (saveTimer) saveNow(); }
function scheduleView(){ clearTimeout(viewTimer); viewTimer = setTimeout(function(){ if (curView !== 'more') renderTab(); }, 1200); }

function setCV(id, txt, cls){ var el = $(id); if (!el) return; el.querySelector('span').textContent = txt; el.className = 'cv' + (cls ? ' ' + cls : ''); }
function trendSlope(k, w){   // kg pro Woche, Regression über 14 Tage
  var pts = [];
  for (var i = 0; i < 14; i++){ var kk = addDays(k, -i), v = kk === k ? w : (days[kk] && days[kk].w); if (v != null) pts.push([-i, v]); }
  if (pts.length < 3 || pts[0][0] - pts[pts.length - 1][0] < 4) return null;
  var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  pts.forEach(function(p){ sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
  var d = n * sxx - sx * sx; if (!d) return null;
  return round1(7 * (n * sxy - sx * sy) / d);
}
function updateComputed(){
  var w = parseField('w', inputs.w.value).v, b = bmiOf(w);
  setCV('c-bmi', b == null ? '–' : num(b, 1), ''); setCV('c-bmi2', b == null ? '–' : num(b, 1), '');
  setCV('c-w2', w == null ? '–' : num(w, 1), '');
  var wk = trend(cur, w, 7, 3), mo = trend(cur, w, 30, 7);
  setCV('c-wk', wk == null ? '–' : signed(wk, 1) + ' kg', wk == null ? 'na' : wk < 0 ? 'pos' : wk > 0 ? 'neg' : '');
  setCV('c-mo', mo == null ? '–' : signed(mo, 1) + ' kg', mo == null ? 'na' : mo < 0 ? 'pos' : mo > 0 ? 'neg' : '');
  var a7 = []; for (var i = 0; i < 7; i++){ var kk = addDays(cur, -i), v = kk === cur ? w : (days[kk] && days[kk].w); if (v != null) a7.push(v); }
  setCV('c-avg', a7.length ? num(round1(avg(a7)), 1) + ' kg' : '–', a7.length ? '' : 'na');
  var sl = w == null ? null : trendSlope(cur, w);
  setCV('c-slope', sl == null ? '–' : signed(sl, 1) + ' kg', sl == null ? 'na' : sl < 0 ? 'pos' : sl > 0 ? 'neg' : '');
  var ko = parseField('kOut', inputs.kOut.value).v, ki = parseField('kIn', inputs.kIn.value).v;
  var df = ko != null && ki != null ? ko - ki : null;
  setCV('c-def', df == null ? '–' : num(df), df == null ? 'na' : df > 0 ? 'pos' : df < 0 ? 'neg' : '');
  var wa = parseField('waist', inputs.waist.value).v, hp = parseField('hip', inputs.hip.value).v;
  setCV('c-whr', wa != null && hp ? num(wa / hp, 2) : '–', wa != null && hp ? '' : 'na');
  var sp = readSport(), tot = sp.reduce(function(s, x){ return s + (x.m || 0); }, 0);
  $('c-sport').textContent = sp.length ? (tot ? tot + ' min' : '') + (sp.length > 1 ? ' · ' + sp.length + ' Einheiten' : '') : '';
  var calc = dayLoad(sp), cb = $('calcIst');
  cb.textContent = sp.length ? '↻ Ist aus Sport berechnen (= ' + calc + ')' : '↻ Ist aus Sport berechnen';
  var pl = planFor(cur); inputs.soll.placeholder = pl != null ? String(pl) : '–';
  var ist = parseField('ist', inputs.ist.value).v, so = parseField('soll', inputs.soll.value).v, se = so != null ? so : pl;
  var info = pl != null ? 'Plan ' + WD[wdIdx(cur)] + ': ' + pl : 'Kein Plan für ' + WD[wdIdx(cur)] + ' (unten festlegen)';
  if (ist != null && se) info += ' · Ist ' + ist + ' = ' + Math.round(ist / se * 100) + ' % vom Soll';
  $('sollInfo').textContent = info;
}

function renderHeader(){
  var t = cur === todayKey();
  $('d1').innerHTML = esc(wdLong(cur)) + ' · ' + (t ? '<b>Heute</b>' : esc(relTxt(cur)));
  $('d2').textContent = fmtDate(cur);
  $('datePick').value = cur;
  $('todayBtn').style.visibility = t ? 'hidden' : 'visible';
}
function loadDay(k, dir){
  flushSave();
  cur = k; if (!document.activeElement || !document.activeElement.classList.contains('pl')) renderPlan();
  var r = days[k] || {};
  NUMKEYS.forEach(function(f){ inputs[f].value = fmtField(f, r[f]); inputs[f].classList.remove('bad'); });
  noteIn.value = r.note || ''; growNote();
  $('sportRows').innerHTML = sportRowsHTML(r.sport || []);
  renderHeader(); updateComputed(); markCur();
  if (dir){ var b = $('tabs'); b.className = ''; void b.offsetWidth; b.className = dir > 0 ? 'swl' : 'swr'; }
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

// Wischen (nicht auf Diagrammen/Listen)
var sw = null;
$('tabs').addEventListener('touchstart', function(e){
  if (e.touches.length !== 1 || e.target.closest('.cw, .vl, .rng, .chs')){ sw = null; return; }
  var t = e.touches[0];
  sw = { x: t.clientX, y: t.clientY, t: Date.now(), focused: e.target === document.activeElement && /INPUT|TEXTAREA/.test(e.target.tagName) };
}, { passive: true });
$('tabs').addEventListener('touchend', function(e){
  if (!sw || sw.focused) { sw = null; return; }
  var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t;
  sw = null;
  if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && dt < 900) goDay(dx < 0 ? 1 : -1);
}, { passive: true });

// Eingaben
function navOrder(){ return Array.prototype.filter.call(document.querySelectorAll('.tab.on input.num, .tab.on .srow input, #f-note'), function(el){ return el.offsetParent !== null; }); }
function focusNext(el){
  var l = navOrder(), i = l.indexOf(el);
  var n = l[i + 1];
  if (n){ n.focus(); try{ n.select(); }catch(_){} } else el.blur();
}
var mainEl = document.querySelector('main');
mainEl.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.keyCode === 13) && !e.isComposing && e.target.tagName === 'INPUT' && e.target.closest('.tab, #noteCard')){ e.preventDefault(); flushSave(); saveNow(); focusNext(e.target); }
});
mainEl.addEventListener('input', function(e){
  var el = e.target; if (!el.closest('.tab, #noteCard')) return;
  var f = el.getAttribute('data-f');
  if (f){
    var d = F[f], v = el.value, c;
    if (d.t === 'hm'){
      var dg = v.replace(/\D/g, '').slice(0, 4);
      c = dg.length >= 3 ? dg.slice(0, -2) + ':' + dg.slice(-2) : dg;
    } else c = v.replace(d.neg ? /[^\d.,\-−]/g : /[^\d.,]/g, '');
    if (c !== v) el.value = c;
    el.classList.remove('bad');
  } else if (el.classList.contains('sm') || el.classList.contains('pl')){ var c2 = el.value.replace(/\D/g, ''); if (c2 !== el.value) el.value = c2; }
  if (el.classList.contains('pl')) return;
  updateComputed(); scheduleSave();
});
mainEl.addEventListener('change', function(e){
  var el = e.target; if (!el.closest('.tab, #noteCard')) return;
  if (el.classList.contains('pl')){ readPlan(); return; }
  saveNow(); updateComputed();
});
mainEl.addEventListener('focusout', function(e){
  var f = e.target.getAttribute && e.target.getAttribute('data-f');
  if (f){ var p = parseField(f, e.target.value); if (p.ok && p.v != null) e.target.value = fmtField(f, p.v); e.target.classList.toggle('bad', !p.ok); }
  if (saveTimer) saveNow();
});
mainEl.addEventListener('focusin', function(e){
  var el = e.target; if (el.tagName !== 'INPUT' || !el.closest('.tab')) return;
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
$('calcIst').addEventListener('click', function(){
  var sp = readSport();
  if (!sp.length){ toast('Erst Sport eintragen', null, true); return; }
  inputs.ist.value = String(dayLoad(sp)); updateComputed(); saveNow(); toast('✓ Ist = ' + dayLoad(sp));
});
function renderPlan(){ Array.prototype.forEach.call(document.querySelectorAll('#plan input'), function(el){ var v = settings.plan[+el.getAttribute('data-wd')]; el.value = v == null ? '' : String(v); }); }
function readPlan(){
  var pl = [];
  Array.prototype.forEach.call(document.querySelectorAll('#plan input'), function(el){ var v = parseInt(el.value, 10); pl[+el.getAttribute('data-wd')] = isNaN(v) ? null : Math.max(0, Math.min(99999, v)); });
  settings.plan = pl; saveSettings(); updateComputed(); scheduleView(); savedHint('✓ Plan gespeichert');
}

// ---------- Diagramme & Verlauf je Tab ----------
var charts = [];
function rangeKeys(range){
  var all = Object.keys(days).sort(), end = todayKey();
  if (all.length && all[all.length - 1] > end) end = all[all.length - 1];
  var start = range === 'all' ? (all[0] && all[0] < end ? all[0] : end) : addDays(end, -(range - 1));
  var keys = [], k = start, guard = 0;
  while (k <= end && guard++ < 20000){ keys.push(k); k = addDays(k, 1); }
  return keys;
}
function series(keys, fn){ return keys.map(function(k){ var r = days[k]; if (!r) return null; var v = fn(r, k); return v == null || isNaN(v) ? null : v; }); }
function fld(name){ return function(r){ return r[name]; }; }
function sr(keys, name){ return series(keys, fld(name)); }
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
  if (o.y1) opt.scales.y1 = { position: 'right', beginAtZero: !!o.y1.zero, grid: { drawOnChartArea: false }, ticks: { color: o.y1.color, precision: o.y1.dec || 0, callback: function(v){ return o.y1.fmt ? o.y1.fmt(v) : numG(v, o.y1.dec || 0); } } };
  if (o.zeroLine) opt.scales.y.grid = { color: function(c){ return c.tick && c.tick.value === 0 ? '#6b7785' : '#2a323c'; }, lineWidth: function(c){ return c.tick && c.tick.value === 0 ? 2 : 1; } };
  return opt;
}
function line(label, data, color, extra){
  var n = data.length, pr = n <= 31 ? 3 : n <= 92 ? 2 : 0;
  var nn = data.filter(function(v){ return v != null; }).length; var sparse = nn < n / 6; if (nn <= 25 || sparse) pr = Math.max(pr, 3);   // wenige Werte: Punkte zeigen
  return Object.assign({ type: 'line', label: label, data: data, borderColor: color, backgroundColor: color, borderWidth: 2.5, pointRadius: pr, pointHoverRadius: 6, pointHitRadius: 8, spanGaps: (n > 120 && !sparse) ? 45 : true, tension: 0.25, order: 0 }, extra || {});
}
function bar(label, data, color, extra){ return Object.assign({ type: 'bar', label: label, data: data, backgroundColor: color, borderRadius: 3, maxBarThickness: 26, order: 1 }, extra || {}); }
function ccard(id, title, sum, tall){ return '<div class="chc"><h3>' + esc(title) + '</h3><div class="sum">' + sum + '</div><div class="cw' + (tall ? ' tall' : '') + '"><canvas id="' + id + '"></canvas></div></div>'; }
function emptyCard(title){ return '<div class="chc"><h3>' + esc(title) + '</h3><p class="empty">Keine Werte in diesem Zeitraum.</p></div>'; }
function mk(id, keys, datasets, o){
  var el = $('v-' + curTab).querySelector('#' + id); if (!el) return;
  charts.push(new Chart(el, { data: { labels: keys.map(fmtShort), datasets: datasets }, options: baseOpts(keys, o) }));
}
function b(v){ return '<b>' + v + '</b>'; }
function lastOf(a){ for (var i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; }
var RED = '#ff6482', BLUE = '#4da3ff', GREEN = '#30d158', ORANGE = '#ff9f0a', PURPLE = '#bf5af2', YELLOW = '#ffd60a', CYAN = '#64d2ff', GREY = '#8e8e93';

var CH = {
  bp: function(keys, h, todo){
    var mS = sr(keys, 'mS'), mD = sr(keys, 'mD'), aS = sr(keys, 'aS'), aD = sr(keys, 'aD'), mP = sr(keys, 'mP'), aP = sr(keys, 'aP');
    var dS = sr(keys, 'dS'), dD = sr(keys, 'dD');
    if (any(mS) || any(mD) || any(aS) || any(aD)){
      var am = avg(mS), amd = avg(mD), aa = avg(aS), aad = avg(aD);
      h.s += ccard('ch1', 'Blutdruck (mmHg)', 'Ø morgens ' + b(am == null ? '–' : numG(am) + '/' + numG(amd)) + ' · Ø abends ' + b(aa == null ? '–' : numG(aa) + '/' + numG(aad)), true);
      var ds = [line('Sys morgens', mS, RED), line('Dia morgens', mD, BLUE), line('Sys abends', aS, '#ffb3c1', { borderDash: [6, 4], pointStyle: 'rectRot' }), line('Dia abends', aD, '#a8d1ff', { borderDash: [6, 4], pointStyle: 'rectRot' })];
      if (any(dS)) ds.push(line('Sys Ø Tag (Uhr)', dS, GREY, { borderDash: [2, 3], borderWidth: 1.5 }), line('Dia Ø Tag (Uhr)', dD, '#b0b6bd', { borderDash: [2, 3], borderWidth: 1.5 }));
      todo.push(['ch1', ds, {}]);
    } else h.s += emptyCard('Blutdruck');
    if (any(mP) || any(aP) || any(sr(keys, 'rhr'))){
      var rh = sr(keys, 'rhr');
      h.s += ccard('ch2', 'Puls (Schläge/Min)', 'Ø morgens ' + b(numG(avg(mP))) + ' · Ø abends ' + b(numG(avg(aP))) + (any(rh) ? ' · Ø Ruhepuls ' + b(numG(avg(rh))) : ''));
      todo.push(['ch2', [line('Puls morgens', mP, ORANGE), line('Puls abends', aP, YELLOW, { borderDash: [6, 4] }), line('Ruhepuls (Uhr)', rh, CYAN, { borderWidth: 2 })], {}]);
    } else h.s += emptyCard('Puls');
  },
  w: function(keys, h, todo){
    var W = sr(keys, 'w');
    if (any(W)){
      var avg7 = keys.map(function(k){ var a = []; for (var i = 0; i < 7; i++){ var r = days[addDays(k, -i)]; if (r && r.w != null) a.push(r.w); } return a.length ? round1(avg(a)) : null; });
      var BMI = W.map(function(w){ return bmiOf(w); });
      var wv = W.filter(function(x){ return x != null; }), last = wv[wv.length - 1], first = wv[0];
      h.s += ccard('ch1', 'Gewicht (kg) & Tendenz', 'Aktuell ' + b(numG(last, 1) + ' kg') + ' · BMI ' + b(numG(bmiOf(last), 1)) + ' · Zeitraum ' + b(signed(round1(last - first), 1) + ' kg'), true);
      todo.push(['ch1', [line('Gewicht', W, GREEN, { dec: 1, fmt: function(v){ return numG(v, 1) + ' kg'; } }), line('Tendenz (7-Tage-Schnitt)', avg7, YELLOW, { pointRadius: 0, borderWidth: 2, dec: 1 }), line('BMI', BMI, PURPLE, { yAxisID: 'y1', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, dec: 1 })], { ydec: 1, y1: { color: PURPLE, dec: 1 } }]);
    } else h.s += emptyCard('Gewicht');
    var KO = sr(keys, 'kOut'), KI = sr(keys, 'kIn'), DF = series(keys, deficit);
    if (any(KO) || any(KI)){
      var sumD = DF.reduce(function(s, x){ return s + (x || 0); }, 0);
      h.s += ccard('ch2', 'Kalorien (kcal)', 'Ø Verbrauch ' + b(numG(avg(KO))) + ' · Ø Aufnahme ' + b(numG(avg(KI))) + '<br>Ø Defizit ' + b(numG(avg(DF))) + ' · Summe ' + b(numG(sumD)) + ' kcal ≈ ' + b(numG(sumD / 7000, 1) + ' kg'), true);
      todo.push(['ch2', [line('Verbrauch', KO, ORANGE), line('Aufnahme', KI, BLUE), bar('Defizit', DF, function(c){ return c.raw != null && c.raw < 0 ? '#ff453a' : '#2fae55'; })], { zero: true }]);
    } else h.s += emptyCard('Kalorien');
  },
  sp: function(keys, h, todo){
    var St = sr(keys, 'steps'), P = sr(keys, 'pai');
    if (any(St) || any(P)){
      h.s += ccard('ch1', 'Schritte & PAI', 'Ø ' + b(numG(avg(St))) + ' Schritte · PAI zuletzt ' + b(numG(lastOf(P))));
      todo.push(['ch1', [bar('Schritte', St, '#2f6fb3'), line('PAI', P, ORANGE, { yAxisID: 'y1' })], { zero: true, y1: { color: ORANGE, zero: true } }]);
    } else h.s += emptyCard('Schritte & PAI');
    var types = [], tm = {};
    keys.forEach(function(k){ (days[k] && days[k].sport || []).forEach(function(s){ var t = s.t || 'Sport'; if (!(t in tm)){ tm[t] = 0; types.push(t); } tm[t] += s.m || 0; }); });
    if (types.length){
      types.sort(function(a, c){ var ia = settings.sports.indexOf(a), ic = settings.sports.indexOf(c); return (ia < 0 ? 99 : ia) - (ic < 0 ? 99 : ic); });
      var total = types.reduce(function(s, t){ return s + tm[t]; }, 0), units = keys.reduce(function(s, k){ return s + (days[k] && days[k].sport ? days[k].sport.length : 0); }, 0);
      h.s += ccard('ch2', 'Sport (Minuten pro Tag)', 'Gesamt ' + b(numG(total) + ' min') + ' · ' + units + ' Einheiten · ' + types.map(function(t){ return esc(t) + ' ' + tm[t]; }).join(', '), true);
      todo.push(['ch2', types.map(function(t, i){
        return bar(t, series(keys, function(r){ var m = 0, f = false; (r.sport || []).forEach(function(s){ if ((s.t || 'Sport') === t){ m += s.m || 0; f = true; } }); return f ? m : null; }), PALETTE[i % PALETTE.length], { fmt: function(v){ return v + ' min'; } });
      }), { stacked: true, zero: true }]);
    } else h.s += emptyCard('Sport');
    var IS = sr(keys, 'ist'), SO = keys.map(function(k){ var v = sollFor(k); return v == null ? null : v; });
    var hasSoll = keys.some(function(k, i){ return SO[i] != null && (IS[i] != null || (days[k] && days[k].soll != null)); });
    if (any(IS) || hasSoll){
      var ds2 = [bar('Ist', IS, '#7d5bd6')];
      if (any(SO)) ds2.push(line('Soll', SO, YELLOW, { borderDash: [6, 4], pointRadius: 0, borderWidth: 2, stepped: true }));
      h.s += ccard('ch3', 'Belastung Ist / Soll', 'Ø Ist ' + b(numG(avg(IS))) + ' · Ø Soll ' + b(numG(avg(SO))) + ' <span class="muted">(Soll = Tageswert oder Wochenplan)</span>');
      todo.push(['ch3', ds2, { zero: true }]);
    } else h.s += emptyCard('Belastung');
    var FO = sr(keys, 'form');
    if (any(FO)){
      h.s += ccard('ch4', 'Trainings-Form', 'Aktuell ' + b(numG(lastOf(FO))) + ' · Ø ' + b(numG(avg(FO))));
      todo.push(['ch4', [line('Trainings-Form', FO, CYAN, { fill: { target: { value: 0 }, above: 'rgba(48,209,88,.18)', below: 'rgba(255,69,58,.18)' } })], { zeroLine: true }]);
    } else h.s += emptyCard('Trainings-Form');
  },
  sl: function(keys, h, todo){
    var SL = series(keys, function(r){ return r.sleep == null ? null : round1(r.sleep / 60 * 10) / 10; }), AP = sr(keys, 'apnoe'), SLm = sr(keys, 'sleep');
    if (any(SL) || any(AP)){
      h.s += ccard('ch1', 'Schlafdauer & Apnoe (Uhr)', 'Ø Dauer ' + b(any(SLm) ? hm(avg(SLm)) + ' Std' : '–') + ' · Ø Apnoe ' + b(numG(avg(AP), 1)), true);
      todo.push(['ch1', [bar('Schlafdauer (Std)', SL, '#3b5f8f', { fmt: function(v){ return hm(v * 60) + ' Std'; } }), line('Apnoe (Uhr)', AP, RED, { yAxisID: 'y1', dec: 1 })], { zero: true, yfmt: function(v){ return v + ' h'; }, y1: { color: RED, zero: true, dec: 0 } }]);
    } else h.s += emptyCard('Schlafdauer');
    var AH = sr(keys, 'ahi'), US = series(keys, function(r){ return r.use == null ? null : round1(r.use / 60 * 10) / 10; });
    if (any(AH) || any(US)){
      h.s += ccard('ch2', 'AirSense 10: AHI & Nutzung', 'Ø AHI ' + b(numG(avg(AH), 1)) + ' · Ø Nutzung ' + b(any(sr(keys, 'use')) ? hm(avg(sr(keys, 'use'))) + ' Std' : '–'));
      todo.push(['ch2', [bar('Nutzung (Std)', US, '#3b5f8f', { fmt: function(v){ return hm(v * 60) + ' Std'; } }), line('AHI', AH, GREEN, { yAxisID: 'y1', dec: 1, pointRadius: 4 })], { zero: true, yfmt: function(v){ return v + ' h'; }, y1: { color: GREEN, zero: true, dec: 0 } }]);
    }
    var LK = sr(keys, 'leak'), MS = sr(keys, 'mask');
    if (any(LK) || any(MS)){
      h.s += ccard('ch3', 'Maskenleckage & Maskensitz', 'Leckage zuletzt ' + b(numG(lastOf(LK), 1)) + ' l/min · Maskensitz zuletzt ' + b(numG(lastOf(MS))));
      todo.push(['ch3', [line('Leckage (l/min)', LK, ORANGE, { pointRadius: 4, dec: 1 }), line('Maskensitz-Score', MS, CYAN, { yAxisID: 'y1', pointRadius: 4 })], { zero: true, y1: { color: CYAN, zero: true } }]);
    }
    var SP2 = sr(keys, 'spo2'), RR = sr(keys, 'rr');
    if (any(SP2) || any(RR)){
      h.s += ccard('ch4', 'Uhr: SpO₂ & Atemfrequenz', 'Ø SpO₂ ' + b(numG(avg(SP2), 1) + ' %') + ' · Ø Atemfrequenz ' + b(numG(avg(RR), 1)));
      todo.push(['ch4', [line('SpO₂ (%)', SP2, CYAN, { dec: 1 }), line('Atemfrequenz', RR, PURPLE, { yAxisID: 'y1', dec: 1 })], { y1: { color: PURPLE, dec: 0 } }]);
    }
  },
  sc: function(keys, h, todo){
    var FA = sr(keys, 'fat'), MU = sr(keys, 'musc'), WA = sr(keys, 'water'), PR = sr(keys, 'prot');
    if (any(FA) || any(MU) || any(WA)){
      h.s += ccard('ch1', 'Körperzusammensetzung (%)', 'Fett zuletzt ' + b(numG(lastOf(FA), 1) + ' %') + ' · Muskeln ' + b(numG(lastOf(MU), 1) + ' %') + ' · Wasser ' + b(numG(lastOf(WA), 1) + ' %'), true);
      todo.push(['ch1', [line('Fett %', FA, RED, { dec: 1 }), line('Muskelrate %', MU, GREEN, { dec: 1 }), line('Wasser %', WA, BLUE, { dec: 1 }), line('Eiweiß %', PR, PURPLE, { dec: 1, borderDash: [5, 4] })], { ydec: 0 }]);
    } else h.s += emptyCard('Körperzusammensetzung');
    var VI = sr(keys, 'visc'), BM = sr(keys, 'bmr');
    if (any(VI) || any(BM)){
      h.s += ccard('ch2', 'Viszeralfett & Grundumsatz', 'Viszeralfett zuletzt ' + b(numG(lastOf(VI), 0)) + ' · Grundumsatz ' + b(numG(lastOf(BM)) + ' kcal'));
      todo.push(['ch2', [line('Viszeralfett', VI, ORANGE), line('Grundumsatz (kcal)', BM, CYAN, { yAxisID: 'y1' })], { y1: { color: CYAN } }]);
    }
    var MK = sr(keys, 'mkg'), AR = sr(keys, 'amR'), AL = sr(keys, 'amL'), LR = sr(keys, 'lgR'), LL = sr(keys, 'lgL');
    if (any(MK) || any(AR) || any(LR)){
      h.s += ccard('ch3', 'Muskeln (kg)', 'Muskelmasse zuletzt ' + b(numG(lastOf(MK), 1) + ' kg'));
      todo.push(['ch3', [line('Muskeln gesamt', MK, GREEN, { dec: 1 }), line('Arm rechts', AR, ORANGE, { yAxisID: 'y1', dec: 1 }), line('Arm links', AL, YELLOW, { yAxisID: 'y1', dec: 1 }), line('Bein rechts', LR, BLUE, { yAxisID: 'y1', dec: 1 }), line('Bein links', LL, CYAN, { yAxisID: 'y1', dec: 1 })], { ydec: 0, y1: { color: ORANGE, dec: 0 } }]);
    }
  },
  bm: function(keys, h, todo){
    var defs1 = [['Brust', 'chest', RED], ['Taille', 'waist', GREEN], ['Bauch', 'belly', ORANGE], ['Hüfte', 'hip', BLUE], ['Schulter', 'shoulder', PURPLE]];
    var ds1 = defs1.map(function(d){ return line(d[0], sr(keys, d[1]), d[2], { dec: 1 }); });
    if (ds1.some(function(d){ return any(d.data); })){
      var wa = lastOf(sr(keys, 'waist')), hp = lastOf(sr(keys, 'hip'));
      h.s += ccard('ch1', 'Rumpf (cm)', 'Taille zuletzt ' + b(numG(wa, 1) + ' cm') + ' · Hüfte ' + b(numG(hp, 1) + ' cm') + (wa && hp ? ' · Taille/Hüfte ' + b(numG(wa / hp, 2)) : ''), true);
      todo.push(['ch1', ds1, { ydec: 0 }]);
    } else h.s += emptyCard('Rumpf');
    var defs2 = [['Oberarm re.', 'uaR', RED], ['Oberarm li.', 'uaL', '#ffb3c1'], ['Oberschenkel re.', 'thR', GREEN], ['Oberschenkel li.', 'thL', '#a6f0bd'], ['Wade re.', 'clR', BLUE], ['Wade li.', 'clL', '#a8d1ff'], ['Hals', 'neck', YELLOW]];
    var ds2 = defs2.map(function(d){ return line(d[0], sr(keys, d[1]), d[2], { dec: 1 }); });
    if (ds2.some(function(d){ return any(d.data); })){
      h.s += ccard('ch2', 'Arme, Beine, Hals (cm)', 'Oberschenkel re. zuletzt ' + b(numG(lastOf(sr(keys, 'thR')), 1) + ' cm') + ' · Oberarm re. ' + b(numG(lastOf(sr(keys, 'uaR')), 1) + ' cm'), true);
      todo.push(['ch2', ds2, { ydec: 0 }]);
    } else h.s += emptyCard('Arme, Beine, Hals');
  }
};
// Verlauf-Liste: Textteile je Tag
function pv(r, k, dec, unit){ return r[k] == null ? null : num(r[k], dec || 0) + (unit || ''); }
var ROW = {
  bp: function(r){
    var p = [];
    if (r.mS != null || r.mD != null) p.push('morgens ' + num(r.mS) + '/' + num(r.mD) + (r.mP != null ? ' ♥' + r.mP : ''));
    if (r.aS != null || r.aD != null) p.push('abends ' + num(r.aS) + '/' + num(r.aD) + (r.aP != null ? ' ♥' + r.aP : ''));
    if (r.dS != null) p.push('Ø Tag ' + r.dS + '/' + num(r.dD));
    if (r.rhr != null) p.push('Ruhepuls ' + r.rhr);
    return p;
  },
  w: function(r, k){
    var p = [];
    if (r.w != null) p.push(num(r.w, 1) + ' kg' + (bmiOf(r.w) ? ' · BMI ' + num(bmiOf(r.w), 1) : ''));
    if (r.kIn != null) p.push('Aufnahme ' + r.kIn);
    if (r.kOut != null) p.push('Verbrauch ' + r.kOut);
    return p;
  },
  sp: function(r){
    var p = [];
    if (r.sport && r.sport.length) p.push(sportText(r));
    if (r.steps != null) p.push(numG(r.steps) + ' Schritte');
    if (r.ist != null || r.soll != null) p.push('Ist ' + num(r.ist) + (r.soll != null ? ' / Soll ' + r.soll : ''));
    else if (r.pai != null) p.push('PAI ' + r.pai);
    return p;
  },
  sl: function(r){
    var p = [];
    if (r.sleep != null) p.push('Schlaf ' + hm(r.sleep));
    if (r.ahi != null) p.push('AHI ' + num(r.ahi, 1));
    if (r.use != null) p.push('Nutzung ' + hm(r.use));
    if (r.leak != null) p.push('Leck ' + num(r.leak, 1));
    if (r.apnoe != null && r.ahi == null) p.push('Apnoe (Uhr) ' + num(r.apnoe, 1));
    if (r.mask != null) p.push('Sitz ' + r.mask);
    if (r.spo2 != null) p.push('SpO₂ ' + num(r.spo2, 1));
    return p;
  },
  sc: function(r){
    var p = [];
    if (r.fat != null) p.push('Fett ' + num(r.fat, 1) + ' %');
    if (r.musc != null) p.push('Muskeln ' + num(r.musc, 1) + ' %');
    if (r.visc != null) p.push('Visz. ' + num(r.visc, 0));
    if (r.water != null) p.push('Wasser ' + num(r.water, 1) + ' %');
    if (r.bmr != null) p.push('BMR ' + r.bmr);
    if (!p.length) NUMKEYS.forEach(function(k){ if (tabKeys.sc.indexOf(k) >= 0 && r[k] != null && p.length < 3) p.push(k + ' ' + num(r[k], 1)); });
    return p;
  },
  bm: function(r){
    var p = [];
    [['chest', 'Brust'], ['waist', 'Taille'], ['belly', 'Bauch'], ['hip', 'Hüfte'], ['thR', 'Oberschenkel re.'], ['uaR', 'Oberarm re.'], ['neck', 'Hals']].forEach(function(d){ if (r[d[0]] != null) p.push(d[1] + ' ' + num(r[d[0]], 1)); });
    return p;
  }
};
function tabHas(t, r){ return tabKeys[t].some(function(k){ return r[k] != null; }) || (t === 'sp' && r.sport && r.sport.length > 0); }
function fmtYY(k){ var d = kd(k); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2); }
function listHTML(t){
  var ks = Object.keys(days).sort().reverse().filter(function(k){ return tabHas(t, days[k]); });
  var n = vlN[t] || 10, h = '';
  if (!ks.length) return '<p class="empty" style="padding:12px">Noch keine Einträge.</p>';
  ks.slice(0, n).forEach(function(k){
    var p = ROW[t](days[k], k);
    h += '<button type="button" class="vr' + (k === cur ? ' cur' : '') + '" data-d="' + k + '"><span class="vd">' + esc(wdShort(k)) + ' ' + fmtYY(k) + '</span><span class="vt">' + esc(p.join(' · ')) + '</span></button>';
  });
  if (ks.length > n) h += '<button type="button" class="more" data-more="1">Mehr anzeigen (' + (ks.length - n) + ' weitere)</button>';
  return h;
}
function markCur(){ Array.prototype.forEach.call(document.querySelectorAll('.vr'), function(x){ x.classList.toggle('cur', x.getAttribute('data-d') === cur); }); }
var TABF = { bp: ['mS','mD','mP','aS','aD','aP','rhr','hrAvg','hrMax','dS','dD'], w: ['w','kIn','kOut','kAct'], sp: ['steps','pai','dist','form','ist','soll','sport'],
  sl: ['sleep','apnoe','ahi','use','leak','leakT','mask','resp','p95','pAvg','hI','oaI','caI','aI','spo2','rr'],
  sc: ['fat','musc','visc','water','prot','mkg','bmr','fatCtl','amR','amL','lgR','lgL'], bm: ['chest','waist','belly','hip','shoulder','uaR','uaL','thR','thL','neck','clR','clL'] };
function renderTab(){
  var t = curTab, sec = $('v-' + t);
  destroyCharts();
  Array.prototype.forEach.call(sec.querySelectorAll('.rng button'), function(x){ x.className = x.getAttribute('data-r') === String(ranges[t]) ? 'on' : ''; });
  var box = sec.querySelector('.chs');
  if (typeof Chart === 'undefined') box.innerHTML = '<p class="empty">Diagramm-Modul konnte nicht geladen werden. Bitte App einmal mit Internet öffnen.</p>';
  else {
    var keys = rangeKeys(ranges[t]), h = { s: '' }, todo = [];
    if (ranges[t] === 'all'){
      var tf = TABF[t], i0 = 0;
      while (i0 < keys.length - 1 && !(days[keys[i0]] && tf.some(function(f){ var v = days[keys[i0]][f]; return v != null && v !== ''; }))) i0++;
      keys = keys.slice(i0);
    }
    CH[t](keys, h, todo);
    box.innerHTML = h.s;
    todo.forEach(function(x){ mk(x[0], keys, x[1], x[2]); });
  }
  sec.querySelector('.vl').innerHTML = listHTML(t);
}
function openDayFromChart(k){ loadDay(k); window.scrollTo(0, 0); }
$('tabs').addEventListener('click', function(e){
  var rb = e.target.closest('.rng [data-r]');
  if (rb){ var r = rb.getAttribute('data-r'); ranges[curTab] = r === 'all' ? 'all' : +r; renderTab(); return; }
  if (e.target.closest('[data-more]')){ vlN[curTab] = (vlN[curTab] || 10) + 20; renderTab(); return; }
  var vr = e.target.closest('.vr');
  if (vr){ loadDay(vr.getAttribute('data-d')); window.scrollTo(0, 0); }
});
if (typeof Chart !== 'undefined'){
  Chart.defaults.color = '#94a0ad';
  Chart.defaults.borderColor = '#2a323c';
  Chart.defaults.font.family = 'system-ui,-apple-system,Roboto,"Segoe UI",sans-serif';
  Chart.defaults.font.size = 12;
}

// ---------- Daten & Einstellungen ----------
function renderMore(){
  $('height').value = settings.height ? String(settings.height) : '';
  $('hrMax').value = String(settings.hrMax); $('birth').value = fmtBirth(settings.birth); renderBirthInfo(); renderPlan();
  renderHeightInfo();
  $('sportEdit').innerHTML = settings.sports.map(function(s, i){
    return '<li data-i="' + i + '"><input type="text" value="' + esc(s) + '" data-a="name" aria-label="Name" enterkeyhint="done">'
      + '<button type="button" class="mb" data-a="up" aria-label="Nach oben"' + (i === 0 ? ' disabled' : '') + '>↑</button>'
      + '<button type="button" class="mb" data-a="down" aria-label="Nach unten"' + (i === settings.sports.length - 1 ? ' disabled' : '') + '>↓</button>'
      + '<button type="button" class="mb del" data-a="del" aria-label="Löschen">🗑</button></li>';
  }).join('');
  renderStats(); renderLabor();
}
function renderBirthInfo(){ var h = hrMaxFromBirth(settings.birth); $('birthInfo').textContent = h ? 'Alter ' + ageOf(settings.birth) + ' · Standard-Max-Puls 220 − Alter = ' + h : 'Standard-Max-Puls: 220 − Alter'; }
$('birth').addEventListener('change', function(){
  var v = this.value.trim(), m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v), iso = m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
  if (!v){ settings.birth = ''; saveSettings(); renderBirthInfo(); toast('✓ Geburtsdatum entfernt'); return; }
  if (!validBirth(iso)){ toast('Bitte Datum als TT.MM.JJJJ eingeben', null, true); this.value = fmtBirth(settings.birth); return; }
  settings.birth = iso; var h = hrMaxFromBirth(iso); if (!settings.hrMaxSet && h){ settings.hrMax = h; $('hrMax').value = String(h); }
  saveSettings(); this.value = fmtBirth(iso); renderBirthInfo(); updateComputed(); toast('✓ Geburtsdatum gespeichert');
});
$('birth').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); this.blur(); } });
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
$('hrMax').addEventListener('input', function(){ var c = this.value.replace(/\D/g, '').slice(0, 3); if (c !== this.value) this.value = c; });
$('hrMax').addEventListener('change', function(){
  var v = parseInt(this.value, 10);
  if (!(v >= 100 && v <= 230)){ toast('Bitte Max-Puls zwischen 100 und 230 eingeben', null, true); this.value = settings.hrMax; return; }
  settings.hrMax = v; settings.hrMaxSet = true; saveSettings(); updateComputed(); toast('✓ Max-Puls ' + v + ' gespeichert');
});
$('hrMax').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); this.blur(); } });
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

// Laborwerte (nur Anzeige)
function renderLabor(){
  var box = $('laborBox');
  if (!labor || !labor.items || !labor.items.length){ box.innerHTML = '<p class="muted" style="margin:0">Noch keine Laborwerte geladen (kommen mit der Import-Datei).</p>'; return; }
  var groups = [], gm = {};
  labor.items.forEach(function(it){ var g = it.g || 'Sonstige'; if (!gm[g]){ gm[g] = []; groups.push(g); } gm[g].push(it); });
  var h = '<p class="muted" style="margin:0 0 8px">Nur zum Nachschlagen · ' + labor.items.length + ' Werte in ' + groups.length + ' Gruppen. Gruppe antippen.</p>';
  groups.forEach(function(g){
    h += '<details class="in"><summary>' + esc(g) + ' <span class="muted">(' + gm[g].length + ')</span></summary><table>';
    gm[g].forEach(function(it){
      var vals = (it.vals || []).slice().sort(function(a, c){ return a.d < c.d ? -1 : 1; }), l = vals[vals.length - 1];
      h += '<tr><td>' + esc(it.n) + (it.ref ? '<div class="rf">Ref. ' + esc(it.ref) + '</div>' : '') + (it.info ? '<div class="rf">' + esc(it.info) + '</div>' : '') + '</td>'
        + '<td class="r">' + (l ? '<b>' + esc(l.v) + '</b> ' + esc(it.u || '') + '<div class="rf">' + esc(fmtDate(l.d)) + '</div>' : '–') + '</td></tr>';
      if (vals.length > 1) h += '<tr><td colspan="2" class="rf" style="border-top:0;padding-top:0">' + vals.slice(0, -1).reverse().map(function(v){ return esc(fmtDate(v.d)) + ': ' + esc(v.v); }).join(' · ') + '</td></tr>';
    });
    h += '</table></details>';
  });
  if (labor.meds && labor.meds.length){
    h += '<details class="in"><summary>Medikation <span class="muted">(' + labor.meds.length + ')</span></summary><table>' + labor.meds.map(function(m){ return '<tr><td>' + esc(m.n) + (m.info ? '<div class="rf">' + esc(m.info) + '</div>' : '') + '</td><td class="r">' + esc(m.dosis || '') + '</td></tr>'; }).join('') + '</table></details>';
  }
  box.innerHTML = h;
}
function mergeLabor(inc){
  if (!inc || !Array.isArray(inc.items)) return 0;
  var n = 0; labor = labor || { items: [], meds: [] };
  inc.items.forEach(function(it){
    if (!it || !it.n) return;
    var ex = labor.items.filter(function(x){ return x.n === it.n && (x.g || '') === (it.g || ''); })[0];
    if (!ex){ labor.items.push(JSON.parse(JSON.stringify(it))); n += (it.vals || []).length; return; }
    (it.vals || []).forEach(function(v){ if (!(ex.vals || (ex.vals = [])).some(function(e){ return e.d === v.d; })){ ex.vals.push(v); n++; } });
  });
  labor.meds = labor.meds || [];
  (inc.meds || []).forEach(function(m){ if (m && m.n && !labor.meds.some(function(x){ return x.n === m.n; })){ labor.meds.push(m); n++; } });
  if (n) saveLabor();
  return n;
}

// ---------- Export ----------
var COLS = ['Datum','Blutdruck Morgens Sys','Blutdruck Morgens Dia','Blutdruck Morgens Puls','Blutdruck Abends Sys','Blutdruck Abends Dia','Blutdruck Abends Puls',
  'Sonstiges','Gewicht','BMI','Wochen-Tendenz','Monats-Tendenz','Sport','Sport Minuten','Schritte','PAI','Kalorien Verbrauch','Kalorien Aufnahme','Kalorien Defizit',
  'Trainings-Form','Belastung IST','Belastung SOLL','Schlafdauer','Schlafapnoe'];
var XCOLS = [['Uhr Ruhepuls','rhr'],['Uhr Herzfrequenz Schnitt','hrAvg'],['Uhr Herzfrequenz max','hrMax'],['Uhr Blutdruck Tag Sys','dS'],['Uhr Blutdruck Tag Dia','dD'],
  ['Kalorien aktiv','kAct'],['Strecke km','dist'],['AirSense AHI','ahi'],['AirSense Nutzung','use'],['AirSense Leckage','leak'],['AirSense Zeit Leck','leakT'],['AirSense Maskensitz-Score','mask'],
  ['AirSense Druck 95','p95'],['AirSense Druck Schnitt','pAvg'],['AirSense Hypopnoe-Index','hI'],['AirSense Obstr Apnoe-Index','oaI'],['AirSense Zentr Apnoe-Index','caI'],['AirSense Apnoe-Index','aI'],['AirSense Atemfrequenz','resp'],
  ['Uhr SpO2','spo2'],['Uhr Atemfrequenz','rr'],
  ['Waage Fett %','fat'],['Waage Muskelrate %','musc'],['Waage Viszeralfett','visc'],['Waage Eiweiss %','prot'],['Waage Wasser %','water'],['Waage Muskeln kg','mkg'],['Waage Grundumsatz','bmr'],['Waage Fettkontrolle','fatCtl'],
  ['Waage Arm rechts kg','amR'],['Waage Arm links kg','amL'],['Waage Bein rechts kg','lgR'],['Waage Bein links kg','lgL'],
  ['Mass Brust','chest'],['Mass Taille','waist'],['Mass Bauch','belly'],['Mass Hueft','hip'],['Mass Schulter','shoulder'],['Mass Oberarm rechts','uaR'],['Mass Oberarm links','uaL'],
  ['Mass Oberschenkel rechts','thR'],['Mass Oberschenkel links','thL'],['Mass Hals','neck'],['Mass Wade rechts','clR'],['Mass Wade links','clL']];
function csvCell(v, text){
  v = String(v == null ? '' : v);
  if (text && /^[=+@\-]/.test(v)) v = "'" + v;
  return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function toCSV(){
  var rows = [COLS.concat(XCOLS.map(function(x){ return x[0]; })).map(function(c){ return csvCell(c); }).join(';')];
  Object.keys(days).sort().forEach(function(k){
    var r = days[k];
    rows.push([fmtDate(k), num(r.mS), num(r.mD), num(r.mP), num(r.aS), num(r.aD), num(r.aP), csvCell(r.note, true),
      num(r.w, 1), num(bmiOf(r.w), 1), num(trend(k, r.w, 7, 3), 1), num(trend(k, r.w, 30, 7), 1),
      csvCell(sportText(r), true), r.sport ? num(sportMin(r)) : '', num(r.steps), num(r.pai), num(r.kOut), num(r.kIn), num(deficit(r)),
      num(r.form), num(r.ist), num(r.soll), r.sleep != null ? hm(r.sleep, true) : '', num(r.apnoe, 1)]
      .concat(XCOLS.map(function(x){ var v = r[x[1]]; return F[x[1]].t === 'hm' ? (v != null ? hm(v, true) : '') : num(v, F[x[1]].t === 'dec' ? 1 : 0); })).join(';'));
  });
  return '\ufeff' + rows.join('\r\n') + '\r\n';
}
function toJSON(){
  var o = { app: 'tageswerte', version: VERSION, exported: new Date().toISOString(),
    settings: { height: settings.height, sports: settings.sports, hrMax: settings.hrMax, birth: settings.birth || undefined, plan: settings.plan },
    days: Object.keys(days).sort().map(function(k){ return days[k]; }) };
  if (labor) o.labor = labor;
  return JSON.stringify(o);
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
  flushSave();
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
  var list = [];
  rows.slice(start).forEach(function(r){
    var d = parseDate(r[map.d]); if (!d) return;
    var rec = { d: d };
    NUMKEYS.forEach(function(k){ if (map[k] == null) return; var p = parseField(k, r[map[k]]); if (p.ok && p.v != null) rec[k] = p.v; });
    if (map.note != null){ var nt = (r[map.note] || '').replace(/^'/, '').trim(); if (nt) rec.note = nt; }
    if (map.sport != null || map.sportMin != null){ var sp = parseSport(map.sport != null ? (r[map.sport] || '').replace(/^'/, '') : '', map.sportMin != null ? r[map.sportMin] : ''); if (sp.length) rec.sport = sp; }
    if (!isEmptyRec(rec)) list.push(rec);
  });
  return list;
}

// Eigenes Format (Sicherung): Satz bereinigen und prüfen
function numOK(k, v){
  if (v == null || v === '') return null;
  var p = typeof v === 'number' ? (isFinite(v) && v >= F[k].min && v <= F[k].max ? { ok: true, v: F[k].t === 'dec' ? round1(v) : Math.round(v) } : { ok: false }) : parseField(k, v);
  return p.ok && p.v != null ? p.v : null;
}
function cleanSport(s){
  if (!s || typeof s !== 'object') return null;
  var m = s.m == null || s.m === '' ? null : Math.round(+s.m); if (m != null && (isNaN(m) || m < 0 || m > 1440)) m = null;
  var o = { t: String(s.t || 'Sport').trim() || 'Sport', m: m };
  if (typeof s.st === 'string' && /^\d{1,2}:\d{2}$/.test(s.st)) o.st = s.st;
  ['hr', 'hrMax', 'kcal'].forEach(function(k){ var v = Math.round(+s[k]); if (s[k] != null && v > 0 && v < 30000) o[k] = v; });
  ['teA', 'teN'].forEach(function(k){ var v = +s[k]; if (s[k] != null && s[k] !== '' && isFinite(v) && v >= 0 && v <= 10) o[k] = round1(v); });
  if (Array.isArray(s.z) && s.z.length === 5){ var z = s.z.map(function(x){ x = Math.round(+x); return isFinite(x) && x >= 0 && x <= 1440 ? x : 0; }); if (z.some(function(x){ return x > 0; })) o.z = z; }
  if (s.src === 'auto') o.src = 'auto';
  return (s.t || m != null || o.st || o.z) ? o : null;
}
function cleanRec(x){
  if (!x || typeof x !== 'object') return null;
  var d = typeof x.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.d) ? x.d : parseDate(x.d || x.datum);
  if (!d) return null;
  var r = { d: d };
  NUMKEYS.forEach(function(k){ var v = numOK(k, x[k]); if (v != null) r[k] = v; });
  if (x.note && String(x.note).trim()) r.note = String(x.note).trim();
  if (Array.isArray(x.sport)){ var sp = x.sport.map(cleanSport).filter(Boolean); if (sp.length) r.sport = sp; }
  else if (typeof x.sport === 'string'){ var sp2 = parseSport(x.sport); if (sp2.length) r.sport = sp2; }
  if (x.auto && typeof x.auto === 'object'){ var au = {}; Object.keys(x.auto).forEach(function(k){ if (x.auto[k] && r[k] != null) au[k] = 1; }); if (Object.keys(au).length) r.auto = au; }
  if (x.created) r.created = String(x.created);
  if (x.updated) r.updated = String(x.updated);
  return isEmptyRec(r) ? null : r;
}

// Fremdformate: Zepp-Tagesdatei und Health-Connect-Export (Drive „Gesundheit“)
var SPORT_DE = { running: 'Laufen', run: 'Laufen', 'outdoor running': 'Laufen', 'indoor running': 'Laufband', treadmill: 'Laufband', walking: 'Gehen', walk: 'Gehen', hiking: 'Wandern',
  cycling: 'Radfahren', biking: 'Radfahren', 'indoor cycling': 'Radfahren (drinnen)', swimming: 'Schwimmen', 'pool swimming': 'Schwimmen', rowing: 'Rudern', 'rowing machine': 'Rudergerät',
  elliptical: 'Crosstrainer', 'cross trainer': 'Crosstrainer', 'strength training': 'Krafttraining', 'free training': 'Freies Training', yoga: 'Yoga', boxing: 'Boxen',
  squash: 'Squash', padel: 'Padel', tennis: 'Tennis', badminton: 'Badminton', 'table tennis': 'Tischtennis', football: 'Fußball', soccer: 'Fußball', basketball: 'Basketball' };
function sportName(v){
  var s = String(v == null ? '' : v).trim(); if (!s) return 'Sport';
  var l = s.toLowerCase().replace(/[_-]+/g, ' ');
  return SPORT_DE[l] || s.charAt(0).toUpperCase() + s.slice(1);
}
function nv(v){ if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; var x = parseNumber(String(v)); return x == null || isNaN(x) ? null : x; }
function sub(o, keys){   // erster vorhandener Zahlenwert aus einem Objekt (oder die Zahl selbst)
  if (o == null) return null;
  if (typeof o !== 'object') return nv(o);
  for (var i = 0; i < keys.length; i++){ var v = nv(o[keys[i]]); if (v != null) return v; }
  return null;
}
function hhmm(v){
  if (v == null || v === '') return null;
  if (typeof v === 'number'){ var t = new Date(v < 1e11 ? v * 1000 : v); return isNaN(t) ? null : pad(t.getHours()) + ':' + pad(t.getMinutes()); }
  var m = String(v).match(/(?:^|[T\s])(\d{1,2}):(\d{2})/); return m ? pad(+m[1]) + ':' + m[2] : null;
}
function extSession(s){
  if (!s || typeof s !== 'object') return null;
  var o = { t: sportName(s.sport || s.type || s.exercise_type || s.activity || s.title || s.name) };
  var m = nv(s.duration_min != null ? s.duration_min : s.duration_minutes);
  if (m == null && nv(s.duration_seconds) != null) m = nv(s.duration_seconds) / 60;
  if (m == null && nv(s.duration_s) != null) m = nv(s.duration_s) / 60;
  o.m = m != null && m >= 0 && m <= 1440 ? Math.round(m) : null;
  var st = hhmm(s.start != null ? s.start : s.start_time); if (st) o.st = st;
  var hr = nv(s.avg_hr != null ? s.avg_hr : s.avg_bpm); if (hr > 0 && hr < 260) o.hr = Math.round(hr);
  var hx = nv(s.max_hr != null ? s.max_hr : s.max_bpm); if (hx > 0 && hx < 260) o.hrMax = Math.round(hx);
  var kc = nv(s.kcal != null ? s.kcal : s.calories); if (kc > 0 && kc < 30000) o.kcal = Math.round(kc);
  var ta = nv(s.te_aerob), tn = nv(s.te_anaerob); if (ta != null && ta >= 0 && ta <= 10) o.teA = round1(ta); if (tn != null && tn >= 0 && tn <= 10) o.teN = round1(tn);
  var z = s.zones_min; if (z && typeof z === 'object'){
    var za = Array.isArray(z) ? z : [z.leicht, z.intensiv, z.aerob, z.anaerob, z.vo2max];
    if (za.length === 5){ za = za.map(function(x){ x = Math.round(nv(x) || 0); return x >= 0 && x <= 1440 ? x : 0; }); if (za.some(function(x){ return x > 0; })) o.z = za; }
  }
  if (o.m == null && !o.z && !o.st) return null;
  o.src = 'auto';
  return o;
}
function extToRec(o, dflt){
  var d = parseDate(o.date || o.d || o.day || dflt); if (!d) return null;
  var r = { d: d }, au = {};
  function put(k, v){ var x = numOK(k, v); if (x != null){ r[k] = x; au[k] = 1; } }
  put('steps', sub(o.steps, ['total_steps', 'steps', 'total', 'count']));
  put('w', sub(o.weight_kg != null ? o.weight_kg : o.weight, ['weight_kg', 'kg', 'value']));
  put('rhr', sub(o.rest_hr != null ? o.rest_hr : (o.resting_heart_rate != null ? o.resting_heart_rate : o.resting_hr), ['avg_bpm', 'bpm', 'value', 'min_bpm']));
  var hr = o.heart_rate || o.hr; if (hr && typeof hr === 'object'){ put('hrAvg', sub(hr, ['avg_bpm', 'avg', 'bpm'])); put('hrMax', sub(hr, ['max_bpm', 'max'])); }
  put('kOut', sub(o.calories != null ? o.calories : (o.total_calories != null ? o.total_calories : o.kcal), ['total_calories_kcal', 'kcal', 'total', 'value']));
  put('kAct', sub(o.active_calories != null ? o.active_calories : o.active_kcal, ['total_calories_kcal', 'kcal', 'total', 'value']));
  var dm = sub(o.distance, ['total_distance_meters', 'meters', 'm']), dk = dm != null ? dm / 1000 : (o.distance_km != null ? nv(o.distance_km) : sub(o.distance, ['km', 'total_distance_km']));
  put('dist', dk);
  var bp = o.bp || o.blood_pressure;
  if (bp && typeof bp === 'object'){ put('dS', sub({ v: bp.sys != null ? bp.sys : bp.systolic_mmhg != null ? bp.systolic_mmhg : bp.systolic }, ['v'])); put('dD', sub({ v: bp.dia != null ? bp.dia : bp.diastolic_mmhg != null ? bp.diastolic_mmhg : bp.diastolic }, ['v'])); }
  var sp = sub(o.oxygen_saturation != null ? o.oxygen_saturation : o.spo2, ['percentage', 'percent', 'value']); if (sp != null && sp > 0 && sp <= 1) sp *= 100; put('spo2', sp);
  put('rr', sub(o.respiratory_rate, ['rate', 'breaths_per_minute', 'value']));
  put('pai', nv(o.pai));
  var sl = null;
  if (o.sleep_min != null) sl = nv(o.sleep_min);
  else if (o.sleep_minutes != null) sl = nv(o.sleep_minutes);
  else if (o.sleep != null){ if (typeof o.sleep === 'object'){ sl = sub(o.sleep, ['minutes', 'total_minutes', 'duration_minutes', 'duration_min']); if (sl == null){ var hs = sub(o.sleep, ['hours', 'total_hours']); if (hs != null) sl = hs * 60; } if (sl == null){ var ss = sub(o.sleep, ['seconds', 'total_seconds', 'duration_seconds']); if (ss != null) sl = ss / 60; } } else sl = nv(o.sleep); }
  if (sl != null) put('sleep', Math.round(sl));
  var list = o.sessions || o.exercises || o.exercise_sessions || o.workouts;
  if (Array.isArray(list)){ var sess = list.map(extSession).filter(Boolean); if (sess.length){ r.sport = sess; r._calc = true; } }
  if (Object.keys(au).length) r.auto = au;
  return (NUMKEYS.some(function(k){ return r[k] != null; }) || r.sport) ? r : null;
}
var DATEKEY = /^\d{4}-\d{2}-\d{2}$/;
function collectExt(data, fileDate){
  var list = [], own = false;
  function item(x, dflt){
    if (!x || typeof x !== 'object') return;
    var r;
    if (x.d && !x.date){ r = cleanRec(x); own = true; } else r = extToRec(x, dflt);
    if (r) list.push(r);
  }
  if (Array.isArray(data)) data.forEach(function(x){ item(x, fileDate); });
  else if (data && typeof data === 'object'){
    if (Array.isArray(data.days)) data.days.forEach(function(x){ item(x, fileDate); });
    else if (data.date || data.d) item(data, fileDate);
    else {
      var ks = Object.keys(data).filter(function(k){ return DATEKEY.test(k) && data[k] && typeof data[k] === 'object'; });
      if (ks.length) ks.forEach(function(k){ item(Object.assign({ date: k }, data[k]), k); });
      else if (fileDate) item(data, fileDate);
    }
  }
  return { list: list, own: own || (data && data.app === 'tageswerte') };
}

// Zusammenführen nach Datum
function setAuto(rec, k, on){ if (on){ rec.auto = rec.auto || {}; rec.auto[k] = 1; } else if (rec.auto){ delete rec.auto[k]; if (!Object.keys(rec.auto).length) delete rec.auto; } }
function sportCompat(a, b){ return a == null || b == null || Math.abs(a - b) <= 10; }
function mergeSport(ex, inc, used){
  var changed = false; ex.sport = ex.sport || [];
  inc.forEach(function(s){
    var hit = null;
    ex.sport.forEach(function(e){
      if (hit || used.indexOf(e) >= 0) return;
      if (e.t.toLowerCase() !== s.t.toLowerCase()) return;
      if (e.st && s.st ? e.st === s.st : sportCompat(e.m, s.m)) hit = e;
    });
    if (hit){
      used.push(hit);
      var before = JSON.stringify(hit);
      if (hit.src === 'auto'){ Object.keys(s).forEach(function(k){ if (k !== 't') hit[k] = s[k]; }); }
      else { Object.keys(s).forEach(function(k){ if (k === 'src' || k === 't') return; if (hit[k] == null || (k === 'm' && hit.m == null)) hit[k] = s[k]; }); }
      if (JSON.stringify(hit) !== before) changed = true;
    } else { var c = JSON.parse(JSON.stringify(s)); ex.sport.push(c); used.push(c); changed = true; }
  });
  if (!ex.sport.length) delete ex.sport;
  return changed;
}
function mergeDays(list, over, res){
  var writes = [], nowIso = new Date().toISOString(), seen = {};
  list.forEach(function(r){
    var isNew = !days[r.d], ex = days[r.d] || { d: r.d }, ch = false;
    NUMKEYS.forEach(function(k){
      if (r[k] == null) return;
      var inA = !!(r.auto && r.auto[k]), ev = ex[k];
      if (ev == null){ ex[k] = r[k]; setAuto(ex, k, inA); ch = true; }
      else if (ev === r[k]){ /* gleich: nichts zu tun */ }
      else if (ex.auto && ex.auto[k]){ ex[k] = r[k]; setAuto(ex, k, inA); ch = true; }
      else if (over){ ex[k] = r[k]; setAuto(ex, k, inA); res.overwritten++; ch = true; }
      else res.conflicts.push({ d: r.d, k: k, old: ev, nw: r[k] });
    });
    if (r.note){
      if (!ex.note){ ex.note = r.note; ch = true; }
      else if (ex.note.indexOf(r.note) < 0){ ex.note = ex.note + '\n' + r.note; ch = true; }
    }
    if (r.sport){ if (mergeSport(ex, r.sport, [])) ch = true; }
    if (r._calc && ex.sport){
      var ist = dayLoad(ex.sport);
      if (ist > 0 && (ex.ist == null || (ex.auto && ex.auto.ist)) && ex.ist !== ist){ ex.ist = ist; setAuto(ex, 'ist', true); ch = true; }
    }
    if (isEmptyRec(ex)) return;
    if (isNew){ ex.created = r.created || nowIso; ex.updated = r.updated || nowIso; days[r.d] = ex; res.added++; writes.push(ex); }
    else if (ch){ ex.updated = nowIso; if (writes.indexOf(ex) < 0) writes.push(ex); if (!seen[r.d]){ res.updated++; seen[r.d] = 1; } }
    else if (!seen[r.d]) res.same++;
    if (isNew) seen[r.d] = 1;
  });
  // neue Sportarten in die Schnellauswahl, aber nur wenn sie mindestens 3-mal vorkommen (keine Einzelfälle)
  var cnt = {}, ns = 0;
  Object.keys(days).forEach(function(k){ (days[k].sport || []).forEach(function(x){ if (x.t && x.t !== 'Sport'){ var l = x.t.toLowerCase(); cnt[l] = (cnt[l] || 0) + 1; } }); });
  var cand = []; writes.forEach(function(r){ (r.sport || []).forEach(function(x){ if (x.t && cnt[x.t.toLowerCase()] >= 3) cand.push(x); }); });
  if (cand.length && addSportsFrom(cand)) ns = 1;
  res.sports += ns;
  return writes.length ? putDays(writes) : Promise.resolve();
}
function newRes(){ return { added: 0, updated: 0, same: 0, conflicts: [], overwritten: 0, future: 0, errors: [], sports: 0, files: 0, labor: 0 }; }
function importText(text, opts, res){
  opts = opts || {}; res = res || newRes();
  text = String(text).replace(/^\ufeff/, '');
  return ready.then(function(){
    flushSave();
    var list, data = null, own = false;
    if (/^\s*[\{\[]/.test(text)){
      data = JSON.parse(text);
      var c = collectExt(data, opts.fileDate); list = c.list; own = c.own;
      if (!list.length && !(data && data.labor)) throw new Error('Keine Tageswerte in der Datei erkannt');
    } else list = csvToDays(text).map(cleanRec).filter(Boolean);
    var tk = addDays(todayKey(), 1), keep = list.filter(function(r){ if (r.d > tk){ res.future++; return false; } return true; });
    if (data && !Array.isArray(data) && data.settings && typeof data.settings === 'object'){
      var st = data.settings, ch = false;
      if (Array.isArray(st.sports)) st.sports.forEach(function(s){ if (s && !settings.sports.some(function(x){ return x.toLowerCase() === String(s).toLowerCase(); })){ settings.sports.push(String(s)); ch = true; } });
      var hh = +st.height; if (!settings.heightSet && hh >= 100 && hh <= 250 && hh !== settings.height){ settings.height = hh; ch = true; }
      if (!settings.birth && validBirth(st.birth)){ settings.birth = st.birth; ch = true; }
      var hx = +st.hrMax; if (!settings.hrMaxSet && hx >= 100 && hx <= 230 && hx !== settings.hrMax){ settings.hrMax = hx; ch = true; }
      if (Array.isArray(st.plan) && st.plan.length === 7 && settings.plan.every(function(x){ return x == null; })){ var pl = st.plan.map(function(x){ return x == null || isNaN(+x) ? null : +x; }); if (pl.some(function(x){ return x != null; })){ settings.plan = pl; ch = true; } }
      if (ch){ saveSettings(); renderSportChips(); renderPlan(); }
    }
    if (data && data.labor) res.labor += mergeLabor(data.labor);
    res.files++;
    return mergeDays(keep, !!opts.over, res).then(function(){ return res; });
  });
}
function resultHTML(r){
  var p = [];
  p.push('<b>' + r.added + '</b> neue ' + (r.added === 1 ? 'Tag' : 'Tage'));
  p.push('<b>' + r.updated + '</b> ergänzt/aktualisiert');
  p.push('<b>' + r.same + '</b> unverändert');
  var h = '<div class="res"><div>' + (r.files > 1 ? r.files + ' Dateien: ' : '') + p.join(' · ') + '</div>';
  if (r.labor) h += '<div>Labor/Medikation: ' + r.labor + ' Werte neu</div>';
  if (r.sports) h += '<div>Neue Sportarten in die Auswahl übernommen.</div>';
  if (r.overwritten) h += '<div>' + r.overwritten + ' von Hand eingetragene Werte überschrieben.</div>';
  if (r.future) h += '<div>' + r.future + ' Einträge in der Zukunft übersprungen.</div>';
  if (r.conflicts.length){
    h += '<div class="warn"><b>' + r.conflicts.length + ' abweichende Werte</b> wurden NICHT überschrieben (von Hand eingetragen):<ul>';
    r.conflicts.slice(0, 12).forEach(function(c){ h += '<li>' + esc(fmtDate(c.d)) + ' · ' + esc(c.k) + ': bleibt ' + esc(fmtField(c.k, c.old)) + ' (Datei: ' + esc(fmtField(c.k, c.nw)) + ')</li>'; });
    if (r.conflicts.length > 12) h += '<li>… und ' + (r.conflicts.length - 12) + ' weitere</li>';
    h += '</ul>Zum Übernehmen: Haken „Von Hand eingetragene Werte überschreiben“ setzen und die Datei nochmal laden.</div>';
  }
  if (r.errors.length) h += '<div class="warn">' + r.errors.map(function(e){ return esc(e.name) + ': ' + esc(e.msg); }).join('<br>') + '</div>';
  return h + '</div>';
}
function fileDateOf(name){ var m = String(name || '').match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; }
function readFile(f){ return new Promise(function(res, rej){ var rd = new FileReader(); rd.onload = function(){ res(rd.result); }; rd.onerror = function(){ rej(new Error('Datei nicht lesbar')); }; rd.readAsText(f); }); }
function importFiles(files, over){
  var res = newRes();
  return Array.prototype.reduce.call(files, function(p, f){
    return p.then(function(){
      return readFile(f).then(function(t){ return importText(t, { over: over, fileDate: fileDateOf(f.name) }, res); })
        .catch(function(e){ res.errors.push({ name: f.name, msg: e.message || String(e) }); });
    });
  }, Promise.resolve()).then(function(){ return res; });
}
$('impBtn').addEventListener('click', function(){ $('impFile').value = ''; $('impFile').click(); });
$('impFile').addEventListener('change', function(){
  var fs = this.files; if (!fs || !fs.length) return;
  $('impRes').innerHTML = '<p class="muted">Import läuft …</p>';
  importFiles(fs, $('impOver').checked).then(function(r){
    $('impRes').innerHTML = resultHTML(r);
    var bad = r.errors.length;
    toast((bad && !r.files ? 'Import fehlgeschlagen' : '✓ Import: ' + r.added + ' neu, ' + r.updated + ' ergänzt, ' + r.same + ' unverändert') + (r.conflicts.length ? ', ' + r.conflicts.length + ' Abweichungen' : ''), null, bad && !r.files);
    loadDay(cur); renderMore(); renderSportChips(); renderTab();
  });
});
$('wipe').addEventListener('click', function(){
  if (!window.confirm('Wirklich ALLE Tageswerte löschen?')) return;
  if (!window.confirm('Sicher? Das kann nicht rückgängig gemacht werden. Vorher Sicherung gemacht?')) return;
  clearTimeout(saveTimer); saveTimer = null;
  queue(function(){ return tx(['days'], 'readwrite', function(t){ t.objectStore('days').clear(); }); }).then(function(){
    days = {}; loadDay(cur); renderMore(); renderTab(); toast('Alle Tageswerte gelöscht (Laborwerte bleiben)');
  });
});
function renderStats(){
  var ks = Object.keys(days).sort();
  var s = ks.length ? ks.length + (ks.length === 1 ? ' Tag' : ' Tage') + ' mit Werten (' + fmtDate(ks[0]) + ' – ' + fmtDate(ks[ks.length - 1]) + ')' : 'Noch keine Werte eingetragen';
  $('stats').textContent = s + (persisted === true ? ' · Speicher dauerhaft geschützt' : '');
}

// ---------- Navigation ----------
var curView = curTab, moreOpen = false;
function setHeader(more){
  $('hdrDay').hidden = more; $('hdrOther').hidden = !more;
  $('hdrTitle').textContent = 'Einstellungen';
}
function showTab(t){
  flushSave();
  if (!ENT[t]) t = 'bp';
  curTab = t; curView = t; moreOpen = false;
  try{ localStorage.setItem('tw-tab', t); }catch(e){}
  Array.prototype.forEach.call(document.querySelectorAll('#tabs > .tab'), function(s){ s.className = 'view tab' + (s.id === 'v-' + t ? ' on' : ''); });
  $('v-more').className = 'view';
  Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function(x){ x.className = x.getAttribute('data-v') === t ? 'on' : ''; });
  setHeader(false);
  $('v-' + t).querySelector('.ent').appendChild($('noteCard'));
  renderHeader(); updateComputed(); renderTab();
  window.scrollTo(0, 0);
}
function showMore(){
  flushSave();
  curView = 'more'; moreOpen = true; destroyCharts();
  Array.prototype.forEach.call(document.querySelectorAll('#tabs > .tab'), function(s){ s.className = 'view tab'; });
  $('v-more').className = 'view on';
  Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function(x){ x.className = ''; });
  setHeader(true); renderMore(); window.scrollTo(0, 0);
}
function openMore(){
  if (curView === 'more') return;
  try{ history.pushState({ more: 1 }, ''); }catch(e){}
  showMore();
}
function closeMore(t){
  if (t) curTab = t;
  if (history.state && history.state.more){ history.back(); }   // popstate zeigt den Tab
  else showTab(curTab);
}
window.addEventListener('popstate', function(){ if (curView === 'more') showTab(curTab); });
$('cogBtn').addEventListener('click', openMore);
$('backBtn').addEventListener('click', function(){ closeMore(); });
$('nav').addEventListener('click', function(e){
  var b = e.target.closest('button[data-v]'); if (!b) return;
  var t = b.getAttribute('data-v');
  if (curView === 'more') closeMore(t);
  else if (t !== curView) showTab(t);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});
var hiddenAt = 0;
document.addEventListener('visibilitychange', function(){
  if (document.visibilityState === 'hidden'){ flushSave(); hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 30 * 60000 && curView !== 'more' && cur !== todayKey()) loadDay(todayKey());
  else if (curView !== 'more') renderHeader();
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
renderSportChips(); loadDay(cur); showTab(curTab);
ready.then(function(){ renderSportChips(); renderPlan(); if (!saveTimer) loadDay(cur); else { saveNow(); updateComputed(); } renderTab(); });

// für Tests
window.__tw = { version: VERSION, ready: function(){ return ready.then(function(){ return writeQ; }); }, days: function(){ return days; }, settings: function(){ return settings; }, labor: function(){ return labor; },
  cur: function(){ return cur; }, tab: function(){ return curTab; }, view: function(){ return curView; }, showTab: showTab, openMore: openMore, loadDay: loadDay, renderTab: renderTab,
  toCSV: toCSV, toJSON: toJSON, importText: function(t, o){ return importText(t, o).then(function(r){ loadDay(cur); renderTab(); return r; }); }, importFiles: importFiles,
  parseHM: parseHM, parseNumber: parseNumber, bmi: bmiOf, loadOfSession: loadOfSession, dayLoad: dayLoad, sollFor: sollFor,
  flush: function(){ flushSave(); return writeQ; } };
})();
