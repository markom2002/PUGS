export type GeoPoint={latitude:number;longitude:number};
export type MapTarget=GeoPoint&{label:string;country:string};
export type MapGuess=GeoPoint&{name:string;distanceKm:number;points:number};
export type MapSnapshot={target:MapTarget|null;guess:GeoPoint|null;distanceKm:number|null;guesses:MapGuess[]|null};
export const validPoint=(p:GeoPoint)=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;
export function distanceKm(a:GeoPoint,b:GeoPoint):number {
  if(!validPoint(a)||!validPoint(b))throw new Error('Označi važeće mesto na mapi.');
  const r=(n:number)=>n*Math.PI/180,dLat=r(b.latitude-a.latitude),dLon=r(b.longitude-a.longitude);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a.latitude))*Math.cos(r(b.latitude))*Math.sin(dLon/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export const mapPoints=(km:number)=>km<=50?150:km<=200?130:km<=500?100:km<=1000?70:km<=2000?40:km<=4000?10:0;
export const projectPoint=(p:GeoPoint)=>({x:(p.longitude+180)*1000/360,y:(90-p.latitude)*500/180});
export const unprojectPoint=(x:number,y:number):GeoPoint=>({longitude:Math.max(-180,Math.min(180,x*360/1000-180)),latitude:Math.max(-90,Math.min(90,90-y*180/500))});
