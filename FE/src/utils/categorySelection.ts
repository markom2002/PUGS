export const MAP_CATEGORY='Pronađi na mapi';
export const MIN_CATEGORIES=2;
export const validCategories=(selected:string[],available:string[])=>selected.length>=MIN_CATEGORIES&&new Set(selected).size===selected.length&&selected.every(c=>available.includes(c));
export function selectedCategories(available:string[],votes:string[][]):string[]{
  // Randomize ties once, then keep every category chosen by at least one competitor.
  return [...available].sort(()=>Math.random()-.5).filter(c=>votes.some(v=>v.includes(c)))
    .sort((a,b)=>Number(a===MAP_CATEGORY)-Number(b===MAP_CATEGORY)||votes.filter(v=>v.includes(b)).length-votes.filter(v=>v.includes(a)).length);
}
export const categoryIcon=(category:string,index:number)=>category===MAP_CATEGORY?'◎':category==='Igrice'?'🎮':['↗','◈','◎','⚡','◷','⌘','✳','❋'][index%8];
