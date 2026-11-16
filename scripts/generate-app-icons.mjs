import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../FE/package.json',import.meta.url));
const {Resvg}=require('@resvg/resvg-js');
const mascot=await readFile(new URL('../FE/public/skocko.svg',import.meta.url),'utf8');
const body=mascot.replace(/<\?xml[^>]*>/g,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
await mkdir(new URL('../FE/public/icons/',import.meta.url),{recursive:true});
const windowsIcons=[];
for(const size of[16,32,48,180,192,256,512]){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><defs><radialGradient id="bg"><stop stop-color="#483266"/><stop offset="1" stop-color="#10121c"/></radialGradient></defs><rect width="512" height="512" rx="108" fill="url(#bg)"/><circle cx="256" cy="256" r="205" fill="none" stroke="#d2ff65" stroke-opacity=".18" stroke-width="2"/><svg x="112" y="95" width="288" height="320" viewBox="0 0 90 100">${body}</svg></svg>`;
 const png=new Resvg(svg).render().asPng();
 if([180,192,512].includes(size))await writeFile(new URL(`../FE/public/icons/app-${size}.png`,import.meta.url),png);
 if([16,32,48,256].includes(size))windowsIcons.push({size,png});
}
console.log('Generated native app icons: 180, 192 and 512 px.');

const header=Buffer.alloc(6+16*windowsIcons.length);header.writeUInt16LE(1,2);header.writeUInt16LE(windowsIcons.length,4);
let offset=header.length;
windowsIcons.forEach(({size,png},i)=>{const entry=6+i*16;header[entry]=size===256?0:size;header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(png.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=png.length;});
await writeFile(new URL('../FE/public/icons/skocko.ico',import.meta.url),Buffer.concat([header,...windowsIcons.map(x=>x.png)]));
console.log('Generated Windows mascot icon (16/32/48/256 px).');
