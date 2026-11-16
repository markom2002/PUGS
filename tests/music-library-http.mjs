import assert from 'node:assert/strict';

const base=(process.env.ARENA_TEST_URL || 'http://127.0.0.1:5107')+'/api/arena/';
async function call(path,token,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{'X-Player-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert(r.ok,JSON.stringify(d));return d;}
const status=await call('music/status');assert(status.count>=5);assert.equal(status.storage,"SQL Server / QuizAppDB");assert(Object.keys(status.genres).length>=5);
const host=await call('rooms',null,{name:'Auto Music QA',seconds:20});const path='rooms/'+host.code;
const guest=await call(path+'/join',null,{name:'Listener QA'});
for(const p of[host,guest])await call(path+'/vote',p.token,{categories:['Sport','Nauka','Priroda','Istorija']});
await call(path+'/start',host.token,{});
const state=await call(path,guest.token);assert.equal(state.musicCount,5);assert.equal(state.music,null);assert.equal(state.phase,'countdown');

console.log('PASS: SQL Server contains the genre catalogue; start selected 5 automatically without uploads; guest sees no song titles.');
