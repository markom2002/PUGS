import assert from 'node:assert/strict';
const base = process.env.ARENA_TEST_URL || 'http://127.0.0.1:5099';
async function call(path, token, body, expected = 200) {
  const response = await fetch(`${base}/api/arena/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-Player-Token': token } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  assert.equal(response.status, expected, path + ' HTTP status');
  return response.json();
}
assert.equal((await fetch(base + '/arena')).status, 200);
const host = await call('rooms', null, { name: 'HTTP host', seconds: 10 });
const room = `rooms/${host.code}`;
const guest = await call(room + '/join', null, { name: 'HTTP guest' });
await call(room, 'wrong', undefined, 401);
await call(room + '/start', guest.token, {}, 401);
const categories = ['Sport', 'Nauka', 'Priroda', 'Istorija'];
await call(room + '/vote', host.token, { categories });
await call(room + '/vote', guest.token, { categories });
// Valid one-second PCM WAV fixture, no third-party recordings.
const wav = Buffer.alloc(44 + 8000 * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < 5; i++) {
  const body = new FormData(); body.append('file', new Blob([wav], { type: 'audio/wav' }), 'fixture.wav'); body.append('title', `Test song ${i}`); body.append('artist', 'Test artist');
  await call(room + '/music', host.token, body);
}
const lobby = await call(room, guest.token);
assert.equal(lobby.musicCount, 5); assert.equal(lobby.music, null);
await call(room + '/start', host.token, {});
await new Promise(resolve => setTimeout(resolve, 4100));
const state = await call(room, guest.token);
assert.equal(state.phase, 'question'); assert.equal(state.index, 0); assert.equal(state.answer, null);
await call(room + '/answer', guest.token, { index: 0, answer: 'HTTP fixture answer' });
await call(room + '/answer', guest.token, { index: 0, answer: 'second try' }, 400);
assert.equal((await call(room, guest.token)).submitted, true);
console.log('PASS HTTP: SPA, room creation, joining, authentication, voting, five audio uploads, countdown, private answers and duplicate protection.');
