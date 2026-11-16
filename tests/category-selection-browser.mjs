// Run the local fixture: dotnet run --project tests/MapChecks -- --serve
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5198',delay=ms=>new Promise(r=>setTimeout(r,ms));
async function api(route,session,body){const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(session?{'X-Player-Token':session.token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
const output=path.resolve('.qa/categories');await mkdir(output,{recursive:true});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-first-run','--remote-debugging-port=9352','--user-data-dir='+path.join(output,'browser-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket;
try{
 let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:9352/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(100);}assert(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let next=0;const pending=new Map();socket.onmessage=e=>{const d=JSON.parse(e.data),p=pending.get(d.id);if(p){pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout '+expression+'\n'+await evaluate('document.body.innerText'));};
 const click=async text=>{assert(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b||b.disabled)return false;b.click();return true;})()`),'Button: '+text);};
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:950,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:base+'/arena'});await waitFor('Boolean(document.querySelector(".arena-entry-card"))');
 assert.equal(await evaluate('[...document.querySelectorAll("label")].some(l=>l.querySelector("input[type=checkbox]")&&l.textContent.includes("Pronađi na mapi"))'),false,'Map is not a create-form checkbox');
 const host=await api('/api/arena/rooms',null,{name:'Host'});const guest=await api(`/api/arena/rooms/${host.code}/join`,null,{name:'Guest'});
 await api(`/api/arena/rooms/${host.code}/vote`,guest,{categories:['Igrice','Pronađi na mapi']});
 await evaluate(`sessionStorage.setItem('pugs-arena',${JSON.stringify(JSON.stringify(host))})`);
 await send('Page.navigate',{url:base+'/arena?code='+host.code});await waitFor('document.querySelectorAll(".category-grid button").length===10');
 assert(await evaluate('[...document.querySelectorAll(".category-grid button")].some(b=>b.textContent.includes("Igrice"))'));
 assert(await evaluate('[...document.querySelectorAll(".category-grid button")].some(b=>b.textContent.includes("Pronađi na mapi"))'));
 await click('Igram sa ekipom');await waitFor('[...document.querySelectorAll(".category-grid button")].every(b=>!b.disabled)');
 await evaluate('[...document.querySelectorAll(".category-grid button")].find(b=>b.textContent.includes("Igrice")).click()');
 assert(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Potvrdi izabrane oblasti")).disabled'),'One choice cannot be confirmed');
 await evaluate('[...document.querySelectorAll(".category-grid button")].find(b=>b.textContent.includes("Pronađi na mapi")).click()');
 assert(await evaluate('![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Potvrdi izabrane oblasti")).disabled'),'Two choices enable confirmation');
 await click('Potvrdi izabrane oblasti');await waitFor('Boolean(document.querySelector(".success-text"))');
 const state=await api(`/api/arena/rooms/${host.code}`,host);assert.deepEqual(state.votes,['Igrice','Pronađi na mapi']);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 await evaluate('document.querySelector(".category-grid").scrollIntoView({block:"center"})');await delay(400);
 let shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'phone-categories.png'),Buffer.from(shot.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await delay(200);
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'desktop-categories.png'),Buffer.from(shot.data,'base64'));
 await click('Pokreni partiju');await waitFor('Boolean(document.querySelector(".countdown"))');await api('/test/advance/4',null,{});await waitFor('Boolean(document.querySelector(".stage-kicker"))');
 const running=await api(`/api/arena/rooms/${host.code}`,host);assert.equal(running.totalQuestions,20);assert.deepEqual(running.selected,['Igrice','Pronađi na mapi']);
 await api('/test/advance/250',null,{});await waitFor('Boolean(document.querySelector(".world-quiz-map"))');
 assert(await evaluate('document.querySelector(".stage-kicker").textContent.includes("3 / 4")'),'Map is round three of the four-round minimum game');
 console.log('PASS map and gaming cards in lobby, no create checkbox, two-category readiness, 20-question match, dynamic round counter and phone/desktop layouts.');
}finally{socket?.close();browser.kill();}
