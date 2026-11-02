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
 }}finally{editing=false;}}
const observer=new MutationObserver(()=>{if(!editing)sync();});observer.observe(list,{childList:true,subtree:false});
// Re-render if another garage action changes a selected car or restores a save.
document.addEventListener('click',e=>{if(!e.target.closest('.unique-in-card,.unique-in-card-toggle'))queueMicrotask(sync);},true);
sync();
})();