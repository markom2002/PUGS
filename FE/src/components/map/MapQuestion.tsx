import React,{useRef,useState} from 'react';
import land from './worldLand.json';
import {GeoPoint,MapSnapshot,projectPoint,unprojectPoint} from '../../utils/mapRound';
import './MapQuestion.css';

type Props={snapshot?:MapSnapshot|null;submitted:boolean;revealed:boolean;disabled?:boolean;busy?:boolean;spectator?:boolean;me:string;points?:number|null;onSubmit:(point:GeoPoint)=>void};
type View={x:number;y:number;width:number;height:number};
const colors=['#f7b955','#62d9d1','#b7a2ff','#ff8eb5','#8ed68b','#76baff','#e8d66d','#e89a78'];
const full:View={x:0,y:0,width:1000,height:500};
const bound=(v:View):View=>({...v,x:Math.max(0,Math.min(1000-v.width,v.x)),y:Math.max(0,Math.min(500-v.height,v.y))});
const km=(distance:number)=>new Intl.NumberFormat('sr-Latn',{maximumFractionDigits:distance<10?1:0}).format(distance)+' km';

export default function MapQuestion({snapshot,submitted,revealed,disabled,busy,spectator,me,points,onSubmit}:Props){
  const [selection,setSelection]=useState<GeoPoint|null>(null),[view,setView]=useState<View>(full);
  const drag=useRef<{x:number;y:number;view:View;moved:boolean}|null>(null);
  const svg=useRef<SVGSVGElement>(null);
  const locked=disabled||submitted||revealed||spectator;
  const guess=submitted?snapshot?.guess||selection:selection;
  const target=revealed?snapshot?.target:null;
  const guesses=revealed?[...(snapshot?.guesses||[])].sort((a,b)=>a.distanceKm-b.distanceKm):[];
  const zoom=1000/view.width;
  function zoomBy(factor:number){
    setView(v=>{
      const width=Math.max(50,Math.min(1000,v.width/factor)),height=width/2;
      const anchor=guess?projectPoint(guess):{x:v.x+v.width/2,y:v.y+v.height/2};
      return bound({x:anchor.x-width/2,y:anchor.y-height/2,width,height});
    });
  }
  function position(clientX:number,clientY:number){
    const matrix=svg.current?.getScreenCTM();
    if(!matrix)return null;
    const point=new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse());
    if(point.x<view.x||point.x>view.x+view.width||point.y<view.y||point.y>view.y+view.height)return null;
    return unprojectPoint(point.x,point.y);
  }
  function keyDown(e:React.KeyboardEvent<SVGSVGElement>){
    if(locked)return;
    if(e.key==='Enter'&&guess&&!busy){e.preventDefault();onSubmit(guess);return;}
    if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();const point=guess||unprojectPoint(view.x+view.width/2,view.y+view.height/2),step=2/zoom;
    setSelection({latitude:Math.max(-90,Math.min(90,point.latitude+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0))),longitude:Math.max(-180,Math.min(180,point.longitude+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)))});
  }
  return <div className="map-question">
    <div className="map-question-heading"><span>PRONAĐI NA MAPI</span><span>MAKSIMALNO 150 POENA</span></div>
    <p id="map-help">{revealed?'Zlatna zvezda je tačna lokacija. Brojevi označavaju odgovore ekipe.':spectator?'Ekipa bira lokacije. Oznake i tačno mesto otkrivaju se po isteku vremena.':'Dodirni mapu da postaviš oznaku. Uvećaj za precizniji izbor; prevuci da pomeriš mapu.'}</p>
    <div className="map-toolbar" aria-label="Kontrole mape">
      <button type="button" aria-label="Uvećaj mapu" disabled={zoom>=20} onClick={()=>zoomBy(2)}>＋</button>
      <button type="button" aria-label="Umanji mapu" disabled={zoom<=1} onClick={()=>zoomBy(.5)}>−</button>
      <button type="button" onClick={()=>setView(full)}>Ceo svet</button><span>{Math.round(zoom)}×</span>
    </div>
    <svg ref={svg} className={`world-quiz-map ${locked?'locked':''}`} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} role="application" aria-label="Mapa sveta: izaberi lokaciju" aria-describedby="map-help" tabIndex={locked?-1:0} onKeyDown={keyDown}
      onPointerDown={e=>{if(e.button!==0)return;svg.current?.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,view,moved:false};}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>6)d.moved=true;if(d.moved&&d.view.width<1000){const rect=svg.current!.getBoundingClientRect();setView(bound({...d.view,x:d.view.x-dx*d.view.width/rect.width,y:d.view.y-dy*d.view.height/rect.height}));}}}
      onPointerUp={e=>{const d=drag.current;drag.current=null;if(d&&!d.moved&&!locked){const p=position(e.clientX,e.clientY);if(p)setSelection(p);}if(svg.current?.hasPointerCapture(e.pointerId))svg.current.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{drag.current=null;}}>
      <rect x="0" y="0" width="1000" height="500" fill="#0d2030"/>
      <g className="map-graticule">{[-60,-30,0,30,60].map(lat=><line key={'lat'+lat} x1="0" x2="1000" y1={projectPoint({latitude:lat,longitude:0}).y} y2={projectPoint({latitude:lat,longitude:0}).y}/>)}{[-120,-60,0,60,120].map(lon=><line key={'lon'+lon} y1="0" y2="500" x1={projectPoint({latitude:0,longitude:lon}).x} x2={projectPoint({latitude:0,longitude:lon}).x}/>)}</g>
      <path d={land.path} fill="#294653" stroke="#5c7c87" strokeWidth={.7/zoom} fillRule="evenodd"/>
      {target&&guesses.map((p,i)=>{
        const a=projectPoint(target),b=projectPoint(p),color=colors[i%colors.length];
        if(Math.abs(a.x-b.x)>500){const shifted=b.x<a.x?b.x+1000:b.x-1000,offset=b.x<a.x?-1000:1000;return <g key={p.name}><line x1={a.x} y1={a.y} x2={shifted} y2={b.y} stroke={color} strokeWidth={1/zoom} opacity=".65"/><line x1={a.x+offset} y1={a.y} x2={shifted+offset} y2={b.y} stroke={color} strokeWidth={1/zoom} opacity=".65"/></g>;}
        return <line key={p.name} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1/zoom} opacity=".65"/>;
      })}
      {guesses.map((p,i)=>{const at=projectPoint(p);return <g key={p.name} transform={`translate(${at.x},${at.y}) scale(${1/zoom})`}><title>{p.name}: {km(p.distanceKm)}, {p.points} poena</title><circle r="9" fill={colors[i%colors.length]} stroke="#0d2030" strokeWidth="2"/><text textAnchor="middle" dy="3.5" fontSize="10" fontWeight="800" fill="#0d2030">{i+1}</text></g>;})}
      {!revealed&&guess&&<g transform={`translate(${projectPoint(guess).x},${projectPoint(guess).y}) scale(${1/zoom})`} data-testid="my-map-pin"><circle r="10" fill="#f7b955" fillOpacity=".2"/><circle r="5" fill="#f7b955" stroke="#fff" strokeWidth="2"/><path d="M0 -16V-10M0 10V16M-16 0H-10M10 0H16" stroke="#f7b955" strokeWidth="2"/></g>}
      {target&&<g transform={`translate(${projectPoint(target).x},${projectPoint(target).y}) scale(${1/zoom})`} data-testid="map-target"><title>{target.label}, {target.country}</title><circle r="12" fill="#101b24"/><text textAnchor="middle" dy="7" fontSize="24" fill="#ffd77e">★</text></g>}
    </svg>
    <div className="map-attribution">Obrisi kopna: Natural Earth · tastatura: strelice pomeraju oznaku, Enter potvrđuje</div>
    {revealed?<div className="map-result" data-testid="map-result" aria-live="polite">
      <h3>{target?.label}{target&&<small> / {target.country}</small>}</h3>
      {!spectator&&<p>{snapshot?.distanceKm!=null?<>Tvoja oznaka je udaljena <strong>{km(snapshot.distanceKm)}</strong> · <strong>+{points||0} poena</strong></>:'Nisi poslao oznaku za ovo pitanje.'}</p>}
      <ol className="map-result-list">{guesses.map((p,i)=><li key={p.name} className={p.name===me?'me':''}><span style={{background:colors[i%colors.length]}}>{i+1}</span><strong>{p.name}{p.name===me?' · TI':''}</strong><span>{km(p.distanceKm)}</span><b>+{p.points}</b></li>)}</ol>
    </div>:!spectator&&<div className="map-submit"><p aria-live="polite">{submitted?'✓ Oznaka je zaključana. Sačekaj otkrivanje.':guess?`Tvoja oznaka: ${Math.abs(guess.latitude).toFixed(1)}° ${guess.latitude>=0?'S':'J'}, ${Math.abs(guess.longitude).toFixed(1)}° ${guess.longitude>=0?'I':'Z'}`:'Još nisi postavio oznaku.'}</p><button type="button" className="arena-primary" disabled={Boolean(locked||busy||!guess)} onClick={()=>guess&&onSubmit(guess)}>{submitted?'✓ Poslato':busy?'Šaljem…':'Zaključaj lokaciju ↗'}</button></div>}
    <details className="map-scoring"><summary>Kako se boduje udaljenost?</summary><p>Do 50 km: 150 · do 200 km: 130 · do 500 km: 100 · do 1.000 km: 70 · do 2.000 km: 40 · do 4.000 km: 10 · dalje: 0 poena. Brzina ne utiče na poene. Imaš 30 sekundi.</p></details>
  </div>;
}
