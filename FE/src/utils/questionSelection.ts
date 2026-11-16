type Question = {text:string;answers:string[];difficulty:number;topic?:string|null};
const normalize=(s:string)=>s.toLowerCase().replace(/đ/g,'dj').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

// Preserve difficulty progression, then prefer a new subject and new answer.
// Missing topics remain compatible with packs saved before topic metadata existed.
export function pickProgressiveQuestions<T extends Question>(source:T[]):T[] {
  const pool=[...source].sort(()=>Math.random()-.5),chosen:T[]=[];
  const topics=new Set<string>(),answers=new Set<string>();
  for(let level=1;level<=5;level++) {
    pool.sort((a,b)=>Math.abs(a.difficulty-level)-Math.abs(b.difficulty-level)
      ||Number(topics.has(normalize(a.topic||a.text)))-Number(topics.has(normalize(b.topic||b.text)))
      ||Number(a.answers.some(answer=>answers.has(normalize(answer))))-Number(b.answers.some(answer=>answers.has(normalize(answer)))));
    const q=pool.shift();
    if(!q)break;
    chosen.push(q);topics.add(normalize(q.topic||q.text));
    q.answers.map(normalize).filter(Boolean).forEach(answer=>answers.add(answer));
  }
  return chosen.sort((a,b)=>a.difficulty-b.difficulty);
}
