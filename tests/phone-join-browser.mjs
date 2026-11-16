import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.ARENA_TEST_URL||'http://192.168.1.8:5087';
const local='http://localhost:5087';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const host=await (await fetch(local+'/api/arena/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Provera telefona'})})).json();
assert(host.code);
const output=path.resolve('.qa/phone-join');await mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-first-run','--remote-debugging-port=9356','--user-data-dir='+path.join(output,'browser-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
 let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:9356/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(100);}assert(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let next=0;const pending=new Map();const requests=[];
 socket.onmessage=e=>{const d=JSON.parse(e.data),p=pending.get(d.id);if(d.method==='Network.requestWillBeSent')requests.push(d.params.request.url);if(p){pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 const waitFor=async expression=>{for(let i=0;i<250;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout '+expression+'\n'+await evaluate('document.body.innerText'));};
 await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:base+'/arena?code='+host.code});
 await waitFor('Boolean(document.querySelector("input[autocomplete=nickname]"))');
 await evaluate(`(()=>{const input=document.querySelector('input[autocomplete=nickname]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Telefon test');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await evaluate('document.querySelector("form button").click()');
 await waitFor('document.querySelectorAll(".category-grid button").length===10');
 assert(requests.some(u=>u===base+'/api/arena/rooms/'+host.code+'/join'));
 assert(!requests.some(u=>u.includes('localhost')||u.includes('127.0.0.1')),'Phone must never request its own localhost');
 const state=await(await fetch(local+'/api/arena/rooms/'+host.code,{headers:{'X-Player-Token':host.token}})).json();
 assert(state.players.some(p=>p.name==='Telefon test'));
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,new URL(base).protocol==='https:'?'internet.png':'wifi.png'),Buffer.from(shot.data,'base64'));
 for(const route of ['/login','/admin/dashboard','/live-quiz']){
   await send('Page.navigate',{url:base+route});
   await waitFor('location.pathname==="/" && Boolean(document.querySelector(".hero-primary"))');
 }
 console.log('PASS phone joins through '+base+', same-origin API, ten categories, mobile layout and old pages redirect to the current home.');
}finally{
 socket?.close();browser.kill();
 await fetch(local+'/api/arena/rooms/'+host.code+'/leave',{method:'POST',headers:{'Content-Type':'application/json','X-Player-Token':host.token},body:'{}'});
}
