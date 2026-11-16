const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.resolve(__dirname, "../build");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "asset-manifest.json"), "utf8"),
);

const assets = [
  ...new Set([
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.json",
    "/skocko.svg",
    "/icons/app-180.png",
    "/icons/app-192.png",
    "/icons/app-512.png",
    ...Object.values(manifest.files).filter((x) => /\.(js|css)$/.test(x)),
  ]),
];
const hash = crypto.createHash("sha256").update(JSON.stringify(manifest));
for (const asset of assets) {
  if (asset !== "/") hash.update(fs.readFileSync(path.join(root, asset)));
}
const version = hash.digest("hex").slice(0, 12);
const source = `const CACHE='skocko-static-${version}';const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('skocko-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/quizhub')||url.pathname==='/sw.js')return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>response.ok?response:(caches.match('/index.html').then(cached=>cached||response))).catch(()=>caches.match('/index.html').then(cached=>cached||caches.match('/offline.html'))));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.match(url.pathname).then(cached=>cached||fetch(event.request)));
});`;
fs.writeFileSync(path.join(root, "sw.js"), source);
console.log(
  "Generated versioned PWA worker " +
    version +
    "; API and audio are never cached.",
);
