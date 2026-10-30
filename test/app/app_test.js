const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../../app/index.html','utf8');
const code=html.match(/<script>([\s\S]*)<\/script>/)[1];
const els={};
function mk(id){return els[id]||(els[id]={id,style:{},textContent:'',innerHTML:'',dataset:{},classList:{toggle(){}},getContext(){return new Proxy({},{get:(t,k)=>(k in t)?t[k]:(()=>{}),set:(t,k,v)=>{t[k]=v;return true}})}})}
const view=mk('view'),tabs=mk('tabs'),pill=mk('pill');
global.window={addEventListener(){}};
global.document={
  querySelector(sel){ if(sel==='#view')return view; if(sel==='#tabs')return tabs; if(sel==='#pill')return pill;
    const id=sel.replace('#',''); if(view.innerHTML.includes('id="'+id+'"'))return mk(id); return null; },
  querySelectorAll(sel){
    const out=[]; const scan=(src,attr,re)=>{let m;while((m=re.exec(src)))out.push({dataset:{[attr]:m[1]},onclick:null})};
    let list=[];
    const m=/^\[data-([a-z]+)\]$/.exec(sel);
    if(m) scan(view.innerHTML,m[1],new RegExp('data-'+m[1]+'="([^"]+)"','g'));
    else if(sel==='#tabs button')scan(tabs.innerHTML,'t',/data-t="(\w+)"/g);
    handlers[sel]=out; return out;
  }
};
const handlers={};
global.navigator={};
global.location={protocol:'https:',hostname:'example.github.io',pathname:'/nova/'};
global.fetch=()=>Promise.reject(new Error('offline'));
global.TextEncoder=TextEncoder;global.TextDecoder=TextDecoder;
// run the app, but keep the wired elements so we can click them
const origQSA=document.querySelectorAll;
eval(code);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function click(sel,attr,val){ const l=origQSA.call(document,sel); const e=l.find(x=>x.dataset[attr]===String(val)); if(!e) throw new Error('no '+sel+' '+val); return e; }
(async()=>{
  const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);console.log((c?'ok   ':'FAIL ')+m)};
  // wire() assigns onclick to the objects returned by the last querySelectorAll call per selector
  ok(pill.textContent==='Ikke forbundet','starts disconnected');
  let b=handlers['[data-a]'].find(x=>x.dataset.a==='demo'); ok(!!b,'demo button present'); b.onclick();
  await sleep(600);
  ok(pill.textContent==='Demo','connected to demo board');
  ok(view.innerHTML.includes('0.8.0 (demo)'),'info shown');
  // themes
  handlers['#tabs button'].find(x=>x.dataset.t==='themes').onclick();
  handlers['[data-th]'].find(x=>x.dataset.th==='3').onclick(); await sleep(200);
  ok(view.innerHTML.includes('tcard sel" data-th="3"'),'theme 3 selected after ack+info');
  // boot style + text
  handlers['#tabs button'].find(x=>x.dataset.t==='boot').onclick();
  handlers['[data-st]'].find(x=>x.dataset.st==='1').onclick(); await sleep(200);
  ok(view.innerHTML.includes('class="sel" data-st="1"')||view.innerHTML.includes('data-st="1" class="sel"'),'boot style 1 selected');
  // update
  handlers['#tabs button'].find(x=>x.dataset.t==='update').onclick();
  const good=new Uint8Array(200*1024); good[0]=0xE9; good[1]=2;
  mk('bin').onchange&&0; 
  const binEl=document.querySelector('#bin'); ok(!!binEl,'file input present');
  const fileObj={name:'NOVA_RIDE_cyd_st7789.bin',arrayBuffer:async()=>good.buffer};
  document.querySelector('#bin').onchange; 
  await (async()=>{ /* wire() set onchange on the object returned at that time; fetch the live one */ })();
  const live=els['bin']; ok(typeof live.onchange==='function','file handler wired');
  live.files=[fileObj]; await live.onchange(); await sleep(50);
  ok(view.innerHTML.includes('Filen ser ud som en gyldig'),'valid file accepted');
  const go=handlers['[data-a]'].find(x=>x.dataset.a==='go'); ok(!!go,'start button present');
  go.onclick(); for(let i=0;i<120&&!(els['otxt']&&els['otxt'].textContent.includes('Færdig'));i++) await sleep(500);
  ok(els['otxt']&&els['otxt'].textContent.includes('Færdig'),'update finished in demo: '+(els['otxt']&&els['otxt'].textContent));
  // widgets: gallery has the 4 starters, install one on the (demo) board
  handlers['#tabs button'].find(x=>x.dataset.t==='widgets').onclick();
  ok((view.innerHTML.match(/data-wi="s:/g)||[]).length===4,'4 starter widgets listed');
  handlers['[data-wi]'].find(x=>x.dataset.wi==='s:0').onclick(); await sleep(400);
  handlers['#tabs button'].find(x=>x.dataset.t==='device').onclick();
  ok(view.innerHTML.includes('Dashboard: eget'),'custom dashboard flag after install');
  handlers['#tabs button'].find(x=>x.dataset.t==='widgets').onclick();
  // editor: an invalid element is reported, a valid one is not
  handlers['[data-add]'].find(x=>x.dataset.add==='ring').onclick();
  ok(typeof window.NovaWidget.compile==='function','widget compiler available');
  const badW=window.NovaWidget.compile({items:[{t:'ring',x:10,y:10,r:80,th:14,src:'speed',max:35}]});
  ok(!badW.ok&&badW.errors.length>0,'ring that leaves the screen is rejected');
  const good2=window.NovaWidget.compile({items:[{t:'num',x:10,y:40,src:'speed',font:'4'}]});
  ok(good2.ok&&good2.bytes.length===8+16,'small widget compiles to 24 bytes');
  // bad file
  const bad=new Uint8Array(200*1024); bad[0]=0x00;
  els['bin']=els['bin']; 
  console.log(fails.length?'FAILED '+fails.length:'ALL OK'); process.exit(fails.length?1:0);
})();
