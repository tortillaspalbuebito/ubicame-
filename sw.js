const C='ubicame-v8', T='tiles';
const LEAF='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const FILES=['./','index.html','manifest.json','icon-192.png','icon-512.png',LEAF+'leaflet.min.js',LEAF+'leaflet.min.css'];
// la app se guarda aunque falle la librería del mapa (se reintenta después)
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(async c=>{await c.addAll(FILES.filter(f=>!f.startsWith('http')));
  await Promise.all(FILES.filter(f=>f.startsWith('http')).map(f=>c.add(f).catch(()=>{})))}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==T).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url);
  // Pedazos de mapa: primero los guardados; si no hay, se descargan al verlos y se guardan
  if(u.hostname==='tile.openstreetmap.org'||u.hostname.endsWith('tile.opentopomap.org')){
    e.respondWith(caches.open(T).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));
    return;
  }
  // Leaflet: guardado
  if(u.hostname==='cdnjs.cloudflare.com'){e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})));return}
  // Búsquedas y rutas en línea: directo a internet, sin guardar
  if(u.origin!==self.location.origin)return;
  // copia guardada al instante (aunque la señal sea mala); la versión nueva se descarga por detrás
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>{
    const net=fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res});
    if(hit){e.waitUntil(net.catch(()=>{}));return hit}
    return net.catch(()=>caches.match('index.html'));
  }));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(cs=>cs.length?cs[0].focus():self.clients.openWindow('./')))});
