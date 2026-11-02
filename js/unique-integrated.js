(() => {
'use strict';
const BASE=0x5870, STRIDE=0x7f2, CARCOUNT=5;

// Same NFSU2 three-block CRC routine used by the standalone editor.
// It runs immediately before the original Save Editor downloads workingBytes.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = (n << 24) >>> 0;
  for (let bit = 0; bit < 8; bit++) c = (c & 0x80000000) ? (((c << 1) ^ 0x04c11db7) >>> 0) : ((c << 1) >>> 0);
  CRC_TABLE[n] = c;
}
function nfsu2CRC(bytes, start, end) {
  if (end - start < 4) return 0;
  let r = (~(((bytes[start] << 24) | (bytes[start + 1] << 16) |
      (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0)) >>> 0;
  for (let i = start + 4; i < end; i++)
    r = (((r << 8) | bytes[i]) ^ CRC_TABLE[r >>> 24]) >>> 0;
  return (~r) >>> 0;
}
window.nfsu2FinalizeSave = function (editor) {
  const bytes = editor && editor.workingBytes;
  if (!(bytes instanceof Uint8Array) || bytes.length !== 54966 ||
      String.fromCharCode(...bytes.subarray(0, 4)) !== '20CM') {
    throw new Error('Invalid NFSU2 save: expected 54,966-byte 20CM file');
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const blockA = 28;
  const blockB = blockA + dv.getUint32(8, true);
  const end = blockB + dv.getUint32(12, true);
  if (blockB < blockA || end !== bytes.length) {
    throw new Error('Invalid NFSU2 save: block sizes do not match file length');
  }
  dv.setUint32(16, nfsu2CRC(bytes, blockA, blockB), true);
  dv.setUint32(20, nfsu2CRC(bytes, blockB, end), true);
  dv.setUint32(24, nfsu2CRC(bytes, 0, 24), true);
};

// Keep the upstream download handler intact. Capture its click first,
// update the current working save CRCs, then let the original handler run.
// The original .bak is downloaded from the untouched original buffer.
const downloadButton = document.getElementById('btnDownloadSave');
if (downloadButton) {
  downloadButton.addEventListener('click', (event) => {
    const editor = window.__nfsu2Editor;
    if (!editor || !(editor.workingBytes instanceof Uint8Array)) return;
    try {
      window.nfsu2FinalizeSave(editor);
    } catch (error) {
      // Prevent exporting a corrupt or unsupported save.
      event.preventDefault();
      event.stopImmediatePropagation();
      console.error('NFSU2 save checksum update failed:', error);
      window.alert('Unable to export save: ' + error.message);
    }
  }, {capture: true});
}

const parts=[
 ['Weight Reduction',0x2e8],['Transmission',0x2ec],
 ['NOS',0x2f0],['Engine',0x2f4],
 ['Turbo',0x2f8],['Suspension',0x2fc],
 ['Brakes',0x300],['ECU',0x304],['Tires',0x308]
];

// Wide Body Installation (no career unlock or owned-part flags are touched).
// RideInfo's BASE part hash uniquely identifies the stock car model.
// The model-specific slot at +0x30 contains a little-endian 32-bit part hash.
// KITW00 is the original/default body; KITW01..KITW04 are four wide-body variants.
const WIDEBODY_OFFSET = 0x30;
const WIDEBODY_KITS = 4;
const SUV_MODELS = new Set(['ESCALADE', 'HUMMER', 'NAVIGATOR']);
const STOCK_MODELS = [
 '240SX','3000GT','350Z','A3','CELICA','CIVIC','COROLLA','CORSA',
 'ECLIPSE','ESCALADE','FOCUS','G35','GOLF','GTO','HUMMER','IMPREZAWRX',
 'IS300','LANCEREVO8','MIATA','MUSTANGGT','NAVIGATOR','PEUGEOT106',
 'PEUGEOT206','RSX','RX7','RX8','SENTRA','SKYLINE','SUPRA','TIBURON','TT',
 '106','206' // alternate regional asset labels in some builds
];
function partHash(name) {
 let hash = 0xffffffff;
 for (const char of name.toUpperCase())
   hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
 return hash;
}
const MODEL_BY_BASE = new Map(STOCK_MODELS.map(name => [partHash(name + '_BASE'), name]));
function getWideBodyModel(slot) {
 if (!valid(slot)) return null;
 return MODEL_BY_BASE.get(value(slot, 0x18)) || null;
}
function wideBodyHash(model, index) {
 return partHash(model + '_KITW' + String(index).padStart(2, '0') + '_BODY');
}
function kitFromHash(model, hash) {
 for (let i = 0; i <= WIDEBODY_KITS; i++)
   if (wideBodyHash(model, i) === hash) return i;
 return null;
}
function hex32(x) { return '0x' + x.toString(16).toUpperCase().padStart(8, '0'); }
const widebodyExpanded = new Set();
function renderWideBodyPanel(card, slot) {
 let panel = card.querySelector('.widebody-in-card');
 if (!panel) {
   panel = document.createElement('section');
   panel.className = 'widebody-in-card';
   panel.dataset.slot = String(slot);
   panel.innerHTML = `<div class="widebody-in-card-heading"><strong>Installed Wide Body Kit</strong></div>
    <div class="widebody-in-card-status"></div>
    <div class="widebody-in-card-controls">
      <label>Kit <select aria-label="Wide body kit"></select></label>
      <button type="button" data-widebody-apply>Install Selected Kit</button>
    </div>
    <p class="widebody-in-card-note">Changes the installed body part only. Does not unlock the in-game garage menu or alter career rewards.</p>`;
   panel.addEventListener('click', event => event.stopPropagation());
   panel.addEventListener('change', event => {
     if (!event.target.matches('select')) return;
     const model = getWideBodyModel(slot);
     const current = model && kitFromHash(model, value(slot, WIDEBODY_OFFSET));
     panel.querySelector('[data-widebody-apply]').disabled =
       !model || SUV_MODELS.has(model) || event.target.value === '' ||
       Number(event.target.value) === current;
   });
   panel.addEventListener('click', event => {
     if (!event.target.closest('[data-widebody-apply]')) return;
     const select = panel.querySelector('select');
     const model = getWideBodyModel(slot);
     if (!model || SUV_MODELS.has(model) || !valid(slot)) return;
     if (!/^[0-4]$/.test(select.value)) return;
     const selected = Number(select.value);
     const bytes = data();
     if (!bytes) return;
     const offset = BASE + slot * STRIDE + WIDEBODY_OFFSET;
     new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
       .setUint32(offset, wideBodyHash(model, selected), true);
     renderWideBodyPanel(card, slot);
   });
   card.appendChild(panel);
 }
 const status = panel.querySelector('.widebody-in-card-status');
 const select = panel.querySelector('select');
 const apply = panel.querySelector('[data-widebody-apply]');
 select.replaceChildren();
 const model = getWideBodyModel(slot);
 const activeHash = valid(slot) ? value(slot, WIDEBODY_OFFSET) : 0;
 const activeKit = model ? kitFromHash(model, activeHash) : null;
 if (!model || SUV_MODELS.has(model)) {
   const detail = !valid(slot) ? 'No car in this slot.' :
     (model && SUV_MODELS.has(model) ? 'Wide bodies are not available for SUVs.' :
       'Unsupported or custom car model; no changes will be written.');
   status.textContent = detail;
   select.disabled = true;
   apply.disabled = true;
   return;
 }
 status.textContent = model + '  ·  Installed: ' +
    (activeKit === null ? 'Unknown / custom part' : 'KITW' + String(activeKit).padStart(2, '0')) +
    ' (' + hex32(activeHash) + ')';
 if (activeKit === null) {
   const unknown = new Option('Choose a replacement kit...', '');
   select.add(unknown);
 }
 for (let i = 0; i <= WIDEBODY_KITS; i++) {
   const name = 'KITW' + String(i).padStart(2, '0');
   select.add(new Option(name + (i === 0 ? ' — Original body' : ' — Wide body'), String(i)));
 }
 select.disabled = false;
 select.value = activeKit === null ? '' : String(activeKit);
 apply.disabled = true; // changes are explicit; selecting a kit enables Apply
}

const list=document.getElementById('garageSlotsContainer');
if(!list) return;
const expanded=new Set();let editing=false;
function data(){const b=window.__nfsu2Editor?.workingBytes;return b instanceof Uint8Array&&b.length===54966?b:null;}
function valid(slot){const b=data(),off=BASE+slot*STRIDE;return !!b&&b.slice(off+0x27c,off+0x280).some(x=>x!==0);}
function value(slot,offset){const b=data();if(!b)return 0;return new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(BASE+slot*STRIDE+offset,true);}
function edit(slot,offset,on){const b=data();if(!b||!valid(slot))return;new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(BASE+slot*STRIDE+offset,on?1:0,true);}
function renderPanel(card,slot){
 let p=card.querySelector('.unique-in-card');if(!p){p=document.createElement('section');p.className='unique-in-card';p.dataset.slot=slot;
 p.innerHTML='<div class="unique-in-card-heading"><strong>Unique Performance</strong></div><div class="unique-in-card-options"></div><div class="unique-in-card-actions"><button type="button" data-action="all">Enable All</button><button type="button" data-action="none">Disable All</button></div>';
 card.appendChild(p);
 p.addEventListener('click',e=>e.stopPropagation());
 p.addEventListener('change',e=>{if(e.target.matches('input[data-offset]')){edit(slot,Number(e.target.dataset.offset),e.target.checked);refresh(slot);}});
 p.addEventListener('click',e=>{const a=e.target.closest('button[data-action]');if(!a)return;for(const part of parts)edit(slot,part[1],a.dataset.action==='all');refresh(slot);});}
 p.hidden=!expanded.has(slot);
 const group=p.querySelector('.unique-in-card-options');group.replaceChildren();
 for(const [label,offset] of parts){const l=document.createElement('label');l.className='unique-in-card-option';const input=document.createElement('input');input.type='checkbox';input.dataset.offset=offset;input.checked=value(slot,offset)!==0;input.disabled=!valid(slot);l.append(input,document.createTextNode(' '+label));group.append(l);}
}
function refresh(slot){const card=list.querySelectorAll('.slot-card')[slot];if(card&&expanded.has(slot))renderPanel(card,slot);}
function sync(){if(editing)return;editing=true;try{const cards=[...list.querySelectorAll('.slot-card')];for(let i=0;i<Math.min(CARCOUNT,cards.length);i++){
 const card=cards[i];let btn=card.querySelector('.unique-in-card-toggle');if(!btn){btn=document.createElement('button');btn.type='button';btn.className='unique-in-card-toggle';btn.addEventListener('click',e=>{e.stopPropagation();expanded.has(i)?expanded.delete(i):expanded.add(i);sync();});const row=card.querySelector('.slot-top-row');if(row)row.insertAdjacentElement('afterend',btn);else card.prepend(btn);}
 btn.textContent=expanded.has(i)?'▾ Unique Performance (Collapse)':'▸ Unique Performance (Expand)';btn.disabled=!valid(i);btn.setAttribute('aria-expanded',String(expanded.has(i)));if(expanded.has(i))renderPanel(card,i);else card.querySelector('.unique-in-card')?.remove();
 let wideToggle=card.querySelector('.widebody-in-card-toggle');
 if(!wideToggle){
   wideToggle=document.createElement('button');wideToggle.type='button';wideToggle.className='widebody-in-card-toggle';
   wideToggle.addEventListener('click',e=>{e.stopPropagation();widebodyExpanded.has(i)?widebodyExpanded.delete(i):widebodyExpanded.add(i);sync();});
   btn.insertAdjacentElement('afterend',wideToggle);
 }
 wideToggle.textContent=widebodyExpanded.has(i)?'▾ Wide Body Kit (Collapse)':'▸ Wide Body Kit (Expand)';
 wideToggle.disabled=!valid(i);wideToggle.setAttribute('aria-expanded',String(widebodyExpanded.has(i)));
 if(widebodyExpanded.has(i))renderWideBodyPanel(card,i);else card.querySelector('.widebody-in-card')?.remove();
 }}finally{editing=false;}}
const observer=new MutationObserver(()=>{if(!editing)sync();});observer.observe(list,{childList:true,subtree:false});
// Re-render if another garage action changes a selected car or restores a save.
document.addEventListener('click',e=>{if(!e.target.closest('.unique-in-card,.unique-in-card-toggle,.widebody-in-card,.widebody-in-card-toggle'))queueMicrotask(sync);},true);
sync();
})();