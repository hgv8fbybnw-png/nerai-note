/* 狙い目ノート アプリ版の控え係 ― 2026-11-17（狙い目帳の控え係と同じしくみ）
 * 開くとき：スマホの中の控えをすぐ出す（速い・電波がなくても開ける）。同時に裏で新しい版を取りにいき、控えを入れかえる（次に開いたときは新しい版）。
 * ★ 同じ住所（hgv8fbybnw-png.github.io）にほかのアプリもいる。控えの箱は住所ごとに共有なので、消すのは自分の箱（nerainote-app- で始まる名前）だけ。
 *   画像の控え（nerainote-img-）はページが入れるもので、ここでは消さない。
 * 受け口（script.google.com）への行き来には手を出さない。
 */
/* 版2：裏で取った画面が控えとちがったら、開いているページに知らせる（ページが開き直して新しい版になる） */
var BUILD = '2';
var CACHE = 'nerainote-app-v2';
var PAGE = new URL('./', self.registration.scope).href;
var STATIC = ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all([PAGE].concat(STATIC).map(function (u) {
        var url = u === PAGE ? PAGE : new URL(u, self.registration.scope).href;
        return fetch(new Request(url, { cache: 'reload' })).then(function (res) { if (res && res.ok) return c.put(url, res); }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) { return n.indexOf('nerainote-app-') === 0 && n !== CACHE ? caches.delete(n) : null; }));
    }).then(function () { return self.clients.claim(); })
  );
});

function tell() {
  return self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (w) { w.postMessage('nerainote-new'); }); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
  var key = req.mode === 'navigate' ? PAGE : req.url;
  if (req.mode !== 'navigate' && STATIC.every(function (s) { return new URL(s, self.registration.scope).href !== req.url; })) return;
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(key).then(function (hit) {
        var old = hit && key === PAGE ? hit.clone() : null;
        var net = fetch(new Request(key, { cache: 'reload' })).then(function (res) {
          if (!res || !res.ok) return res;
          var copy = res.clone();
          if (!old) { c.put(key, copy); return res; }
          return Promise.all([old.text(), copy.clone().text()]).then(function (t) {
            if (t[0] === t[1]) return res;
            return c.put(key, copy).then(tell).then(function () { return res; });
          });
        }).catch(function () { return hit; });
        if (hit) { e.waitUntil(net); return hit; }
        return net;
      });
    })
  );
});
