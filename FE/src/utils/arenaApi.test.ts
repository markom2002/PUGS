import {arenaApiBase,arenaFetch,connectionMessage} from './arenaApi';
afterEach(()=>jest.restoreAllMocks());
test('production always uses the origin opened on the phone',()=>{
  expect(arenaApiBase('http://localhost:5087',false)).toBe('');
  expect(arenaApiBase('http://localhost:5087/',true)).toBe('http://localhost:5087');
});
test('network failure gives a useful message and never repeats a join',async()=>{
  const fetchMock=jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  global.fetch=fetchMock;
  await expect(arenaFetch('rooms/join',{method:'POST'})).rejects.toThrow(connectionMessage);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/arena/rooms/join');
});
test('an unresponsive request times out',async()=>{
  global.fetch=jest.fn((_url,init)=>new Promise((_resolve,reject)=>{
    init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));
  })) as typeof fetch;
  await expect(arenaFetch('connection',{},10)).rejects.toThrow(connectionMessage);
});
