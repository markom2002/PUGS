import {inviteOrigin,loopbackHost} from './inviteAddress';
const desktop={protocol:'http:',hostname:'localhost',origin:'http://localhost:5087'};
test('never sends localhost to a phone',()=>{
  expect(inviteOrigin(desktop,{},'local')).toBeNull();
  expect(inviteOrigin(desktop,{lanUrls:['http://localhost:5087','http://192.168.1.8:5087']},'local')).toBe('http://192.168.1.8:5087');
  expect(inviteOrigin(desktop,{},'internet')).toBeNull();
});
test('a remote player shares the server they actually joined',()=>{
  const phone={protocol:'https:',hostname:'current.example',origin:'https://current.example'};
  expect(inviteOrigin(phone,{publicUrl:'https://old.example'},'internet')).toBe(phone.origin);
  expect(inviteOrigin(phone,{},'local')).toBeNull();
});
test('recognizes IPv4 and IPv6 loopback',()=>{
  for(const host of ['localhost','127.0.0.1','[::1]','::1'])expect(loopbackHost(host)).toBe(true);
});
