import assert from 'node:assert/strict';
const base=process.env.ARENA_TEST_URL||'http://127.0.0.1:5107';
const connection=await(await fetch(base+'/api/arena/connection')).json();assert.equal(connection.publicMode,true);
for(const url of['/swagger/index.html','/api/Quiz','/api/Auth','/quizhub/negotiate'])assert.equal((await fetch(base+url)).status,404,url+' is private');
assert.equal((await fetch(base+'/api/arena/rooms/123456/music',{method:'POST'})).status,404,'Old upload must be blocked publicly');
assert.equal((await fetch(base+'/api/arena/music/status')).status,200);
let limited=false;for(let i=0;i<12;i++){const r=await fetch(base+'/api/arena/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Rate check '+i,seconds:20})});if(r.status===429){limited=true;assert.equal(r.headers.get('retry-after'),'60');break;}assert.equal(r.status,200);}
assert(limited,'Anonymous room creation is rate-limited');console.log('PASS public play: only Arena API exposed, legacy APIs and uploads blocked; create rate limit active.');
