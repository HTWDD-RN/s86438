const cache_name = "pwa_1";
const content_to_cache = [
    "Lernprogramm/",
    "Lernprogramm/index.html",
    "Lernprogramm/style.css",
    "Lernprogramm/script.js",
    "Lernprogramm/tasks.json",

    "katex/katex.min.css",
    "katex/katex.min.js",
    "katex/contrib/auto-render.min.js",

    "katex/fonts/KaTeX_AMS-Regular.woff2",
    "katex/fonts/KaTeX_Caligraphic-Bold.woff2",
    "katex/fonts/KaTeX_Caligraphic-Regular.woff2",
    "katex/fonts/KaTeX_Fraktur-Bold.woff2",
    "katex/fonts/KaTeX_Fraktur-Regular.woff2",
    "katex/fonts/KaTeX_Main-BoldItalic.woff2",
    "katex/fonts/KaTeX_Main-Bold.woff2",
    "katex/fonts/KaTeX_Main-Italic.woff2",
    "katex/fonts/KaTeX_Main-Regular.woff2",
    "katex/fonts/KaTeX_Math-BoldItalic.woff2",
    "katex/fonts/KaTeX_Math-Italic.woff2",
    "katex/fonts/KaTeX_SansSerif-Bold.woff2",
    "katex/fonts/KaTeX_SansSerif-Italic.woff2",
    "katex/fonts/KaTeX_SansSerif-Regular.woff2",
    "katex/fonts/KaTeX_Script-Regular.woff2",
    "katex/fonts/KaTeX_Size1-Regular.woff2",
    "katex/fonts/KaTeX_Size2-Regular.woff2",
    "katex/fonts/KaTeX_Size3-Regular.woff2",
    "katex/fonts/KaTeX_Size4-Regular.woff2",
    "katex/fonts/KaTeX_Typewriter-Regular.woff2"
];

self.addEventListener('install', event =>
    event.waitUntil(
        caches.open(cache_name).then(cache => cache.addAll(files_to_cache))
    )
);

self.addEventListener('fetch', event => {
    if(event.request.url.startsWith("./tasks.json")){
        event.respondWith(fromNetwork(event.request, 5000).catch(() => fromCache(event.request)));
        event.waitUntil(upddate(event.request));
    }
    else if(event.request.url.startsWith("https://idefix.informatik.htw-dresden.de:8888/api/quizzes/")){
        event.respondWith(fromNetwork(event.request, 5000).catch(() => fromCache(event.request)));
        event.waitUntil(upddate(event.request));
    }
    else{
        event.respondWith(fromNetwork(event.request, 5000).catch(() => fromCache(event.request)));
        event.waitUntil(upddate(event.request));
    }
});

const fromNetwork = (request, timeout) =>
  new Promise((fulfill, reject) => {
    const timeoutId = setTimeout(reject, timeout);
    fetch(request).then(response => {
      clearTimeout(timeoutId);
      fulfill(response);
      update(request);
    }, reject);
  });

const fromCache = request =>
  caches
    .open(CURRENT_CACHE)
    .then(cache =>
      cache
        .match(request)
        .then(matching => matching || cache.match('/offline/'))
    );

const update = request =>
  caches
    .open(CURRENT_CACHE)
    .then(cache =>
      fetch(request).then(response => cache.put(request, response))
    );
