import {pickProgressiveQuestions} from './questionSelection';

const q=(text:string,difficulty:number,topic?:string,answers=[text])=>({text,difficulty,topic,answers});

test('prefers different subjects over repeated templates at the requested difficulty',()=>{
  const pool=[q('First',1,'Rules'),q('Same subject',2,'Rules'),q('History',2,'History'),q('Nature',3,'Nature'),q('Science',4,'Science'),q('Art',5,'Art')];
  for(let i=0;i<30;i++) {
    const selected=pickProgressiveQuestions(pool);
    expect(selected.map(x=>x.text)).toEqual(['First','History','Nature','Science','Art']);
  }
});

test('avoids an answer already accepted under another spelling',()=>{
  const selected=pickProgressiveQuestions([q('First',1,'A',['Đus','deuce']),q('Repeat',2,'B',['DEUCE']),q('New answer',2,'C'),q('Three',3,'D'),q('Four',4,'E'),q('Five',5,'F')]);
  expect(selected[1].text).toBe('New answer');
});

test('difficulty takes priority and repeated subjects are allowed when necessary',()=>{
  const pool=Array.from({length:5},(_,i)=>q('Question '+i,i+1,'Only topic'));
  expect(pickProgressiveQuestions(pool).map(x=>x.difficulty)).toEqual([1,2,3,4,5]);
});

test('old offline packs without topics still select five distinct questions',()=>{
  const pool=Array.from({length:10},(_,i)=>q('Question '+i,i%5+1));
  const selected=pickProgressiveQuestions(pool);
  expect(selected.map(x=>x.difficulty)).toEqual([1,2,3,4,5]);
  expect(new Set(selected.map(x=>x.text)).size).toBe(5);
  expect(pool).toHaveLength(10);
});
