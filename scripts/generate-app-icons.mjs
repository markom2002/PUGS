import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../FE/package.json',import.meta.url));
const {Resvg}=require('@resvg/resvg-js');
const mascot=await readFile(new URL('../FE/public/skocko.svg',import.meta.url),'utf8');
const body=mascot.replace(/<\?xml[^>]*>/g,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
await mkdir(new URL('../FE/public/icons/',import.meta.url),{recursive:true});
for(const size of[180,192,512]){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><defs><radialGradient id="bg"><stop stop-color="#483266"/><stop offset="1" stop-color="#10121c"/></radialGradient></defs><rect width="512" height="512" rx="108" fill="url(#bg)"/><circle cx="256" cy="256" r="205" fill="none" stroke="#d2ff65" stroke-opacity=".18" stroke-width="2"/><svg x="112" y="95" width="288" height="320" viewBox="0 0 90 100">${body}</svg></svg>`;
 await writeFile(new URL(`../FE/public/icons/app-${size}.png`,import.meta.url),new Resvg(svg).render().asPng());
}
console.log('Generated native app icons: 180, 192 and 512 px.');
