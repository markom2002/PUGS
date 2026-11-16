import fs from 'node:fs/promises';import path from 'node:path';
const songs=JSON.parse(await fs.readFile('BE/Arena/Data/music-seed.json','utf8'));
const directory=path.resolve('BE/arena-data/audio-cache');await fs.mkdir(directory,{recursive:true});
const selected=[];for(const genre of new Set(songs.map(s=>s.genre)))selected.push(...songs.filter(s=>s.genre===genre).slice(0,8));
let done=0;for(const song of selected){const target=path.join(directory,song.id+'.mp3');try{await fs.access(target);done++;continue;}catch{}
try{const track=await(await fetch('https://api.deezer.com/track/'+song.id,{signal:AbortSignal.timeout(15000)})).json();const url=new URL(track.preview);if(url.protocol!=='https:'||!url.hostname.endsWith('.dzcdn.net'))throw Error('Invalid preview');
const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok||!(response.headers.get('content-type')||'').startsWith('audio/'))throw Error('Preview unavailable');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000||bytes.length>3*1024*1024)throw Error('Invalid size');await fs.writeFile(target+'.tmp',bytes);await fs.rename(target+'.tmp',target);done++;console.log('READY '+song.artist+' / '+song.title);}catch(e){console.log('SKIP '+song.title+': '+e.message);}}
console.log('Offline previews available: '+done);if(done<5)process.exitCode=1;
