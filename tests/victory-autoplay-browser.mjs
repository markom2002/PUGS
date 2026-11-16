import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd(),data=path.join(root,'.qa/autoplay-data'),base='http://127.0.0.1:5108';await fs.mkdir(data,{recursive:true});
const seed=JSON.parse((await fs.readFile('BE/Arena/Data/music-seed.json','utf8')).replace(/^\uFEFF/,''));const categories=['Sport','Nauka','Priroda','Istorija'];
const questions=Array.from({length:30},(_,i)=>i<25?{Text:'Koji je glavni grad Italije?',Answers:['Rim'],Category:'Geografija',AudioUrl:null,Artist:null}:{Text:'Koja pjesma se čuje?',Answers:seed[i-25].answers,Category:'Muzičko finale',AudioUrl:'deezer:'+seed[i-25].id,Artist:seed[i-25].artist});
const room={Code:'990001',Players:[{Token:'autoplay-host',Name:'Voditelj',Score:0,Correct:0,Votes:categories,Answers:{},ResponseTimesMs:{}},{Token:'autoplay-player',Name:'Ana',Score:1200,Correct:10,Votes:categories,Answers:{28:{Item1:questions[28].Answers[0],Item2:145}},ResponseTimesMs:{28:2000}},{Token:'autoplay-other',Name:'Boris',Score:1000,Correct:8,Votes:categories,Answers:{},ResponseTimesMs:{}}],Music:questions.slice(25),Questions:questions,Selected:categories,Phase:'question',Index:24,Seconds:20,Deadline:new Date(Date.now()+120000).toISOString(),Touched:new Date().toISOString()};
await fs.writeFile(path.join(data,'rooms.json'),JSON.stringify([room]));let server,browser,socket;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){server=spawn('C:\\Program Files\\dotnet\\dotnet.exe',[path.join(root,'BE/bin/Debug/net8.0/BE.dll'),'--urls',base],{cwd:path.join(root,'BE'),env:{...process.env,Arena__DataPath:data,Arena__PublicMode:'true',Arena__Port:'5108',ASPNETCORE_ENVIRONMENT:'Production'},windowsHide:true,stdio:'ignore'});for(let i=0;i<75;i++){try{if((await fetch(base+'/api/arena/music/status')).ok)return;}catch{}await delay(200);}throw Error('Test server failed');}
async function stop(){if(server&&!server.killed&&server.exitCode===null&&server.signalCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});}
try{
 await start();browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless','--disable-gpu','--no-first-run','--autoplay-policy=document-user-activation-required','--remote-debugging-port=9337',`--user-data-dir=${path.join(root,'.qa/autoplay-browser')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let target;for(let i=0;i<50;i++){try{target=(await(await fetch('http://127.0.0.1:9337/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await delay(200);}assert(target);
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});let id=0;const pending=new Map();socket.onmessage=e=>{const d=JSON.parse(e.data);const p=pending.get(d.id);if(p){pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}};const send=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve,reject});socket.send(JSON.stringify({id:current,method,params}));});
 const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
 await send('Page.enable');await send('Page.navigate',{url:base+'/arena?code=990001'});await delay(500);
 await evaluate(`sessionStorage.setItem('pugs-arena',JSON.stringify({code:'990001',token:'autoplay-player'}))`);await send('Page.reload',{ignoreCache:true});
 for(let i=0;i<50;i++){if(await evaluate('Boolean(document.querySelector("#arena-answer"))'))break;await delay(200);}
 const point=JSON.parse(await evaluate(`(()=>{const e=document.querySelector('#arena-answer');if(!e)throw Error('Question not rendered');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2});})()`));
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await delay(300);
 assert(await evaluate('navigator.userActivation.hasBeenActive'),'The in-game gesture must be trusted');
 await stop();room.Index=25;room.Deadline=new Date(Date.now()+20000).toISOString();room.Touched=new Date().toISOString();await fs.writeFile(path.join(data,'rooms.json'),JSON.stringify([room]));await start();
 let musicPlaying=false;for(let i=0;i<60;i++){musicPlaying=await evaluate(`Boolean(document.querySelector('.music-question .equalizer.playing'))`);if(musicPlaying)break;await delay(200);}
 assert(musicPlaying,'Question audio starts automatically without a play click');
 assert.equal(await evaluate(`Boolean(document.querySelector('.initial-hint'))`),false);
 await delay(8500);
 assert(await evaluate(`Boolean(document.querySelector('.music-question .equalizer.playing'))`),'Music continues beyond the previous eight-second limit');
 for(const [label,width,height] of [['desktop',1440,1000],['phone',390,950]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Question fits '+label);
   const capture=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(root,'.qa','music-question-'+label+'.png'),Buffer.from(capture.data,'base64'));
 }
 console.log('PASS automatic question music, longer playback and responsive question stage.');
 await stop();room.Phase='finished';room.Index=29;room.Deadline=new Date().toISOString();room.Touched=new Date().toISOString();await fs.writeFile(path.join(data,'rooms.json'),JSON.stringify([room]));await start();
 let playing=false;for(let i=0;i<90;i++){playing=await evaluate(`Boolean(document.querySelector('.winner-celebration')&&[...document.querySelectorAll('.victory-audio-controls button')].some(b=>b.textContent.includes('Pauziraj')))`);if(playing)break;await delay(200);}
 assert(playing,'Victory audio must start after the earlier gesture, with no click at the finish');
 assert.equal(await evaluate(`document.querySelector('.victory-sound-note')?.textContent||''`),'');
 await send('Page.navigate',{url:'about:blank'});console.log('PASS strict browser autoplay: trusted in-game click, later finish without reload/click, automatic original-song highlight playback.');
}finally{socket?.close();browser?.kill();await stop();}
