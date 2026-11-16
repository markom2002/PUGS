export const loopbackHost=(host:string)=>host==='localhost'||host.endsWith('.localhost')||host==='::1'||host==='[::1]'||/^127\./.test(host);
export type InviteConnection={publicUrl?:string|null;lanUrls?:string[]};
type LocationInfo={protocol:string;hostname:string;origin:string};
export function remoteOrigin(location:LocationInfo):string|null {
  return location.protocol==='https:'&&!loopbackHost(location.hostname)?location.origin:null;
}
export function inviteOrigin(location:LocationInfo,connection:InviteConnection,mode:'local'|'internet'):string|null {
  if(mode==='internet')return remoteOrigin(location)||connection.publicUrl||null;
  if(!loopbackHost(location.hostname))return remoteOrigin(location)?null:location.origin;
  return connection.lanUrls?.find(value=>{
    try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!loopbackHost(u.hostname);}catch{return false;}
  })||null;
}
