import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const root=process.cwd(),data=path.resolve('.qa/offline-proof'),base='http://127.0.0.1:5109';await fs.mkdir(path.join(data,'audio-cache'),{recursive:true});
const files=(await fs.readdir('BE/arena-data/audio-cache')).filter(f=>f.endsWith('.mp3')).slice(0,5);assert.equal(files.length,5);for(const f of files)await fs.copyFile('BE/arena-data/audio-cache/'+f,path.join(data,'audio-cache',f));
const bank=JSON.parse(await fs.readFile('BE/Arena/Data/music-seed.json','utf8'));const song=bank.find(s=>String(s.id)===files[0].split('.')[0]);
const questions=Array.from({length:30},(_,i)=>({Text:'Offline question',Answers:[song.title],Category:'Music',AudioUrl:'deezer:'+song.id,Artist:song.artist}));
const fixture={Code:'990009',Offline:true,Players:[{Token:'host',Name:'Host',Votes:[],Answers:{},ResponseTimesMs:{}},{Token:'guest',Name:'Guest',Votes:[],Answers:{},ResponseTimesMs:{}}],Music:questions.slice(25),Questions:questions,Selected:[],Phase:'question',Index:25,Seconds:15,Deadline:new Date(Date.now()+120000).toISOString(),Touched:new Date().toISOString()};await fs.writeFile(path.join(data,'rooms.json'),JSON.stringify([fixture]));
const server=spawn('dotnet',[path.join(root,'BE/bin/Debug/net8.0/BE.dll'),'--urls',base],{cwd:path.join(root,'BE'),env:{...process.env,Arena__DataPath:data,Arena__PublicMode:'true',ASPNETCORE_ENVIRONMENT:'Production',HTTP_PROXY:'http://127.0.0.1:1',HTTPS_PROXY:'http://127.0.0.1:1'},windowsHide:true,stdio:'ignore'});
try{
 for(let i=0;i<150;i++){try{if((await fetch(base+'/api/arena/music/status')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 const audio=await fetch(base+'/api/arena/rooms/990009/audio/25',{headers:{'X-Player-Token':'guest'}});assert(audio.ok);assert((await audio.arrayBuffer()).byteLength>1000);
 const call=async(p,body,token)=>{const response=await fetch(base+'/api/arena/'+p,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Player-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json();assert(response.ok,JSON.stringify(result));return result;};
 const h=await call('rooms',{name:'Offline test',seconds:15,offline:true});const g=await call('rooms/'+h.code+'/join',{name:'Guest'});await call('rooms/'+h.code+'/vote',{categories:['Sport','Nauka','Priroda','Istorija']},g.token);await call('rooms/'+h.code+'/start',{},h.token);const state=await call('rooms/'+h.code,undefined,g.token);assert(state.offline);assert.equal(state.musicCount,5);
 const musicState=await call('rooms/990009',undefined,'guest');assert.equal(musicState.seconds,20);
 console.log('PASS offline selection and original audio from disk with backend Internet proxy disabled; music timer 15+5=20.');
}finally{server.kill();}
