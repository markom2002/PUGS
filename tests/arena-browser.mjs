import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base = process.env.ARENA_TEST_URL || 'http://127.0.0.1:5087';
const output = path.resolve('.qa'); await mkdir(output, { recursive: true });
const browser = spawn(process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9334', `--user-data-dir=${path.join(output, 'cdp-profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let target;
  for (let i = 0; i < 50; i++) { try { target = (await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(t => t.type === 'page'); if (target) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  assert(target, 'Edge debugging endpoint available');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = event => { const data = JSON.parse(event.data); const wait = pending.get(data.id); if (wait) { pending.delete(data.id); data.error ? wait.reject(new Error(JSON.stringify(data.error))) : wait.resolve(data.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const current = ++id; pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); });
  for (const [name, width, height, route] of [['home-desktop', 1440, 1100, '/'], ['home-phone', 390, 1000, '/'], ['arena-phone', 390, 1000, '/arena']]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: base + route });
    await new Promise(r => setTimeout(r, 1800));
    const result = await send('Runtime.evaluate', { expression: 'JSON.stringify({width:innerWidth, scroll:document.documentElement.scrollWidth, heading:document.querySelector("h1")?.innerText, overflow:[...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,8).map(e=>e.className)})', returnByValue: true });
    const metrics = JSON.parse(result.result.value); console.log(name, metrics);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(path.join(output, name + '-cdp.png'), Buffer.from(screenshot.data, 'base64'));
    assert(metrics.heading && !/can't reach|cannot reach|not available/i.test(metrics.heading), 'Application renders its main heading');
    assert(metrics.scroll <= width + 1, name + ' fits the viewport');
  }
  console.log('PASS browser desktop and phone layouts. Screenshots in .qa.');
} finally { socket?.close(); browser.kill(); }
