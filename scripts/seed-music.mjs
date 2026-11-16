import {writeFile,mkdir,readFile} from 'node:fs/promises';
const groups={
 'Narodna':['Šaban Šaulić','Miroslav Ilić','Halid Bešlić','Haris Džinović','Sinan Sakić','Šerif Konjević','Marinko Rokvić','Nedeljko Bajić Baja','Dragana Mirković','Lepa Brena','Ana Bekuta','Hanka Paldum'],
 'Kafanska':['Toma Zdravković','Šaban Bajramović','Zvonko Bogdan','Predrag Živković Tozovac','Džej','Džej Ramadanovski','Aca Lukas','Mitar Mirić','Radiša Urošević','Ljuba Aličić','Jašar Ahmedovski','Kemal Malovčić'],
 'Pop-folk':['Ceca','Seka Aleksić','Svetlana Ceca Ražnatović','Indira Radić','Sanja Đorđević','Jana','Stoja','Slađa Allegro','Mile Kitić','Aco Pejović','Saša Matić','Dejan Matić','Dženan Lončarević'],
 'Pop i rock':['Dino Merlin','Zdravko Čolić','Bijelo Dugme','Plavi Orkestar','Crvena Jabuka','Parni Valjak','Prljavo Kazalište','Željko Joksimović','Sergej Ćetković','Toše Proeski','Jelena Rozga','Severina','Gibonni','Oliver Dragojević','Tony Cetinski','Đorđe Balašević','Bajaga I Instruktori'],
 'Rep':['Edo Maajka','Frenkie','Dubioza kolektiv','Beogradski Sindikat','Bad Copy','Prti Bee Gee','Gru','Marčelo','Who See','Vojko V','Krankšvester','Smoke Mardeljano','Ajs Nigrutin'],
 'Moderna':['Jala Brat','Buba Corelli','Devito','Nucci','Voyage','Breskvica','Tea Tairović','Aleksandra Prijović','Milica Pavlović','Rasta','Senidah','Relja','Coby','Hurricane','Teodora','Edita','Džipsii']
};
const norm=s=>s.toLowerCase().replace(/đ/g,'dj').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]/g,'');
const songs=new Map();
try{for(const s of JSON.parse(await readFile('BE/Arena/Data/music-seed.json','utf8')))songs.set(s.id,s);}catch{}
async function request(url, options){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});if(r.ok)return r;}catch{}await new Promise(r=>setTimeout(r,1000*(attempt+1)));}return null;}
for(const[genre,artists]of Object.entries(groups)){
 for(const artist of artists){
  const response=await request('https://api.deezer.com/search?q='+encodeURIComponent(artist)+'&limit=50');if(!response){console.log('UNAVAILABLE '+artist);continue;}
  const json=await response.json();const seen=new Set();
  for(const t of json.data||[]){
   if(norm(t.artist.name)!==norm(artist)||!t.preview||!t.readable||/karaoke|tribute|instrumental|live|remix|cover/i.test(t.title+' '+(t.title_version||''))||seen.has(norm(t.title_short)))continue;
   const preview=await request(t.preview,{method:'HEAD'});if(!preview)continue;
   seen.add(norm(t.title_short));songs.set(t.id,{id:t.id,title:t.title_short,artist:t.artist.name,genre,sourceUrl:t.link,answers:[...new Set([t.title_short,t.title])],verifiedAt:new Date().toISOString()});if(seen.size>=10)break;
  }
  console.log(genre+' / '+artist+': '+seen.size+' (total '+songs.size+')');
  // Checkpoint metadata only, never store audio recordings or signed URLs.
  await mkdir('BE/Arena/Data',{recursive:true});await writeFile('BE/Arena/Data/music-seed.json',JSON.stringify([...songs.values()],null,2)+'\n');
  await new Promise(r=>setTimeout(r,200));
 }
}
console.log('Catalogue total: '+songs.size);console.log(JSON.stringify([...songs.values()].reduce((acc,s)=>(acc[s.genre||'Pop i rock']=(acc[s.genre||'Pop i rock']||0)+1,acc),{})));
