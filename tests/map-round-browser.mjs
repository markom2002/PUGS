// Run: dotnet run --project tests/MapChecks -- --serve, then node tests/map-round-browser.mjs
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5198',delay=ms=>new Promise(r=>setTimeout(r,ms));
async function api(route,session,body){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Token':session.token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
const host=await api('/api/arena/rooms',null,{name:'Voditelj',mapEnabled:true});
const player=await api(`/api/arena/rooms/${host.code}/join`,null,{name:'Ana'});
const other=await api(`/api/arena/rooms/${host.code}/join`,null,{name:'Boris'});
for(const p of[player,other])await api(`/api/arena/rooms/${host.code}/vote`,p,{categories:['Sport','Geografija','Nauka','Istorija']});
await api(`/api/arena/rooms/${host.code}/start`,host,{});await api('/test/advance/629',null,{});
const first=await api(`/api/arena/rooms/${host.code}`,player);assert.equal(first.index,25);assert.equal(first.map.target,null);
const secret=(await api(`/test/room/${host.code}`,host)).target;
await api(`/api/arena/rooms/${host.code}/map-answer`,other,{index:25,latitude:secret.latitude,longitude:secret.longitude});
const output=path.resolve('.qa/map-round');await mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-first-run','--remote-debugging-port=9349','--user-data-dir='+path.join(output,'browser-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
 let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:9349/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(100);}assert(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let next=0;const pending=new Map();socket.onmessage=e=>{const d=JSON.parse(e.data),p=pending.get(d.id);if(p){pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout '+expression+'\n'+await evaluate('document.body.innerText'));};
 await send('Page.enable');await send('Page.navigate',{url:base+'/'});await waitFor('Boolean(document.querySelector("h1"))');
 await evaluate(`sessionStorage.setItem('pugs-arena',${JSON.stringify(JSON.stringify(player))})`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:950,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:base+'/arena?code='+host.code});await waitFor('Boolean(document.querySelector(".world-quiz-map"))');
 assert.equal(await evaluate('Boolean(document.querySelector("[data-testid=map-target]"))'),false);
 assert.equal(await evaluate('Boolean(document.querySelector(".map-result-list"))'),false);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Map round fits a phone');
 await evaluate('document.querySelector(".world-quiz-map").scrollIntoView({block:"center"})');
 await delay(500); // Wait for the question-card entry animation before measuring a touch.
 const touch=await evaluate(`(()=>{const svg=document.querySelector('.world-quiz-map');const p=new DOMPoint(${(secret.longitude+180)*1000/360},${(90-secret.latitude)*500/180}).matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y};})()`);
 const {x,y}=touch;
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await waitFor('Boolean(document.querySelector("[data-testid=my-map-pin]"))');
 await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Zaključaj lokaciju")).click()');
 await waitFor('document.querySelector(".map-submit")?.textContent.includes("zaključana")');
 const locked=await api(`/api/arena/rooms/${host.code}`,player);assert.equal(locked.map.target,null);assert.equal(locked.map.guesses,null);assert(locked.submitted);
 assert(Math.abs(locked.map.guess.latitude-secret.latitude)<.1&&Math.abs(locked.map.guess.longitude-secret.longitude)<.1,'Touch selects the intended geographic coordinate');
 assert.equal(await evaluate('Boolean(document.querySelector("[data-testid=map-target]"))'),false);
 const active=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'phone-locked.png'),Buffer.from(active.data,'base64'));
 await api('/test/advance/30',null,{});await waitFor('Boolean(document.querySelector("[data-testid=map-target]"))');
 assert.equal(await evaluate('document.querySelectorAll(".map-result-list li").length'),2);
 assert(await evaluate('document.querySelector(".map-result").textContent.includes("+150")'));
 const photo=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'phone-reveal.png'),Buffer.from(photo.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await delay(200);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 const desktop=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'desktop-reveal.png'),Buffer.from(desktop.data,'base64'));
 console.log('PASS actual touch placement, server submission, hidden target and opponents, distance reveal, 150 points, phone and desktop layouts.');
}finally{socket?.close();browser.kill();}
