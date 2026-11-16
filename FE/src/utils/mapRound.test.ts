import {distanceKm,mapPoints,validPoint,projectPoint,unprojectPoint} from './mapRound';

test('distance takes the short route across the antimeridian and stays finite at antipodes',()=>{
  expect(distanceKm({latitude:0,longitude:179},{latitude:0,longitude:-179})).toBeCloseTo(222.39,1);
  expect(distanceKm({latitude:0,longitude:0},{latitude:0,longitude:180})).toBeCloseTo(20015.11,1);
  expect(distanceKm({latitude:90,longitude:0},{latitude:90,longitude:140})).toBeLessThan(.001);
});
test('known city distance and all scoring boundaries',()=>{
  expect(distanceKm({latitude:51.5074,longitude:-.1278},{latitude:48.8566,longitude:2.3522})).toBeCloseTo(343.56,0);
  expect([0,50,50.01,200,200.01,500,500.01,1000,1000.01,2000,2000.01,4000,4000.01].map(mapPoints)).toEqual([150,150,130,130,100,100,70,70,40,40,10,10,0]);
});
test('projection round trips and malformed coordinates never score',()=>{
  for(const p of [{latitude:90,longitude:-180},{latitude:-90,longitude:180},{latitude:44.8,longitude:20.4}]){
    const projected=projectPoint(p),actual=unprojectPoint(projected.x,projected.y);
    expect(actual.latitude).toBeCloseTo(p.latitude);expect(actual.longitude).toBeCloseTo(p.longitude);
  }
  expect(validPoint({latitude:NaN,longitude:0})).toBe(false);
  expect(validPoint({latitude:91,longitude:0})).toBe(false);
  expect(()=>distanceKm({latitude:0,longitude:Infinity},{latitude:0,longitude:0})).toThrow();
});
