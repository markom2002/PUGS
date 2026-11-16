import {writeFile,mkdir,readFile,rename} from 'node:fs/promises';
const groups={
 'Narodna':['Vesna Zmijanac','Zorica Brunclik','Sne\u017eana \u0110uri\u0161i\u0107','Nada Top\u010dagi\u0107','\u0160emsa Suljakovi\u0107','Enes Begovi\u0107','Osman Had\u017ei\u0107','Ferid Avdi\u0107','Ip\u010de Ahmedovski','Šaban Šaulić','Miroslav Ilić','Halid Bešlić','Haris Džinović','Sinan Sakić','Šerif Konjević','Marinko Rokvić','Nedeljko Bajić Baja','Dragana Mirković','Lepa Brena','Ana Bekuta','Hanka Paldum'],
 'Kafanska':['Toma Zdravković','Šaban Bajramović','Zvonko Bogdan','Predrag Živković Tozovac','Džej','Džej Ramadanovski','Aca Lukas','Mitar Mirić','Radiša Urošević','Ljuba Aličić','Jašar Ahmedovski','Kemal Malovčić'],
 'Pop-folk':['Ceca','Seka Aleksić','Svetlana Ceca Ražnatović','Indira Radić','Sanja Đorđević','Jana','Stoja','Slađa Allegro','Mile Kitić','Aco Pejović','Saša Matić','Dejan Matić','Dženan Lončarević'],
 'Pop i rock':['Dino Merlin','Zdravko Čolić','Bijelo Dugme','Plavi Orkestar','Crvena Jabuka','Parni Valjak','Prljavo Kazalište','Željko Joksimović','Sergej Ćetković','Toše Proeski','Jelena Rozga','Severina','Gibonni','Oliver Dragojević','Tony Cetinski','Đorđe Balašević','Bajaga I Instruktori'],
 'Rep':['Edo Maajka','Frenkie','Dubioza kolektiv','Beogradski Sindikat','Bad Copy','Prti Bee Gee','Gru','Marčelo','Who See','Vojko V','Krankšvester','Smoke Mardeljano','Ajs Nigrutin'],
 'Moderna':['Jala Brat','Buba Corelli','Devito','Nucci','Voyage','Breskvica','Tea Tairović','Aleksandra Prijović','Milica Pavlović','Rasta','Senidah','Relja','Coby','Hurricane','Teodora','Edita','Džipsii']
};
// --folk expands only traditional/kafana artists without rechecking every genre.
const folkOnly=process.argv.includes('--folk');
const limitArg=process.argv.find(v=>v.startsWith('--per-artist='));
const perArtist=limitArg?Number(limitArg.split('=')[1]):10;
if(!Number.isInteger(perArtist)||perArtist<1||perArtist>100)throw Error('--per-artist must be between 1 and 100');
const norm=s=>s.toLowerCase().replace(/\u0111/g,'dj').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]/g,'');
const songs=new Map();
try{for(const s of JSON.parse((await readFile('BE/Arena/Data/music-seed.json','utf8')).replace(/^\uFEFF/,'')))songs.set(s.id,s);}catch(e){if(e.code!=='ENOENT')throw e;}
const originalCount=songs.size;
const known=new Set([...songs.values()].map(s=>norm(s.artist)+'/'+norm(s.title)));
async function request(url,options){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});if(r.ok)return r;}catch{}await new Promise(r=>setTimeout(r,500*(attempt+1)));}return null;}
const excluded=/karaoke|tribute|instrumental|live|remix|cover|koncert|uzivo/i;
const requested=['vesnazmijanac','halidbeslic','sabansaulic','serifkonjevic'];
for(const[genre,artistNames]of Object.entries(groups)){
 const artists=[...artistNames].sort((a,b)=>{const ai=requested.indexOf(norm(a)),bi=requested.indexOf(norm(b));return (ai<0?100:ai)-(bi<0?100:bi);});
 if(folkOnly&&!['Narodna','Kafanska'].includes(genre))continue;
 for(const artist of artists){
  const existingCount=new Set([...songs.values()].filter(s=>norm(s.artist)===norm(artist)).map(s=>norm(s.title))).size;
  const missing=Math.max(0,perArtist-existingCount);
  if(!missing){console.log(genre+' / '+artist+': already '+existingCount);continue;}
  const response=await request('https://api.deezer.com/search?q='+encodeURIComponent(artist)+'&limit=100');
  if(!response){console.log('UNAVAILABLE '+artist);continue;}
  const data=await response.json(),seen=new Set();
  if(data.error)throw Error(artist+": "+JSON.stringify(data.error));
  const candidates=(data.data||[]).filter(t=>{
   const title=norm(t.title_short||t.title),key=norm(artist)+'/'+title;
   if(norm(t.artist.name)!==norm(artist)||!t.preview||!t.readable||excluded.test(norm(t.title+' '+(t.title_version||'')+' '+(t.album?.title||'')))||seen.has(title))return false;
   seen.add(title);return !known.has(key)&&!songs.has(t.id);
  });
  let cursor=0;const verified=[];
  // Bounded parallel HEAD checks; retain catalogue ordering after verification.
  await Promise.all(Array.from({length:Math.min(6,candidates.length)},async()=>{
   while(cursor<candidates.length&&verified.length<missing){const index=cursor++;const t=candidates[index];const preview=await request(t.preview,{method:'HEAD'});
    if(preview&&(preview.headers.get('content-type')||'').startsWith('audio/'))verified.push({t,index});}
  }));
  let added=0;
  for(const{t}of verified.sort((a,b)=>a.index-b.index).slice(0,missing)){
   const song={id:t.id,title:t.title_short||t.title,artist:t.artist.name,genre,sourceUrl:t.link,answers:[...new Set([t.title_short||t.title,t.title])],verifiedAt:new Date().toISOString()};
   songs.set(t.id,song);known.add(norm(song.artist)+'/'+norm(song.title));added++;
  }
  console.log(genre+' / '+artist+': +'+added+' (total '+songs.size+')');
  // Metadata only: signed URLs and audio recordings are never persisted.
  await mkdir('BE/Arena/Data',{recursive:true});await writeFile('BE/Arena/Data/music-seed.json.tmp',JSON.stringify([...songs.values()],null,2)+'\n');await rename('BE/Arena/Data/music-seed.json.tmp','BE/Arena/Data/music-seed.json');
 }
}
console.log('Added: '+(songs.size-originalCount)+' / Catalogue total: '+songs.size);
console.log(JSON.stringify([...songs.values()].reduce((acc,s)=>(acc[s.genre||'Pop i rock']=(acc[s.genre||'Pop i rock']||0)+1,acc),{})));
