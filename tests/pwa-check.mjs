import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root='FE/build/';const read=p=>fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,'');
const manifest=JSON.parse(read('manifest.json'));assert.equal(manifest.id,'/');assert.equal(new URL(manifest.start_url,'https://party.example').pathname,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
for(const size of[192,512]){const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);assert(icon);const image=fs.readFileSync(root+icon.src.replace(/^\//,''));assert.equal(image.readUInt32BE(16),size);assert.equal(image.readUInt32BE(20),size);}
const listeners={};let precache=[];let skips=0;const deleted=[];
const fakeCaches={open:async()=>({addAll:async assets=>{precache=assets;}}),keys:async()=>['other-app-cache','skocko-static-old'],delete:async key=>{deleted.push(key);},match:async()=>undefined};
const context={self:{location:{origin:'https://party.example'},clients:{claim:async()=>{}},skipWaiting:()=>{skips++;},addEventListener:(name,fn)=>{listeners[name]=fn;}},caches:fakeCaches,URL,fetch:async()=>({ok:true})};
vm.runInNewContext(read('sw.js'),context);let task;listeners.install({waitUntil:p=>task=p});await task;
assert(precache.includes('/index.html'));assert(precache.includes('/icons/app-512.png'));assert(precache.every(url=>!url.startsWith('/api/')));assert.equal(skips,0);
await(listeners.activate({waitUntil:p=>task=p}),task);assert.deepEqual(deleted,['skocko-static-old']);
for(const url of['https://party.example/api/arena/rooms/123456','https://party.example/api/arena/rooms/123456/audio/25','https://cdn.example/audio.mp3']){
 let intercepted=false;listeners.fetch({request:{method:'GET',url,mode:'cors'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false,'API/audio must stay network-only');
}
let intercepted=false;listeners.fetch({request:{method:'POST',url:'https://party.example/api/arena/rooms',mode:'cors'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
listeners.message({data:'SKIP_WAITING'});assert.equal(skips,1);console.log('PASS PWA: install icons, manifest, static-only cache, safe updates and no API/audio caching.');
