import 'async-waituntil-polyfill';
import offlineGoogleAnalytics
    from 'sw-helpers/projects/sw-offline-google-analytics/src';


/* global MAIN_CSS_URL, MAIN_JS_URL, MAIN_RUNTIME_URL */


const CACHE_NAME = 'philipwalton:v1';


// Maps relevant custom dimension names to their index.
const dimensions = {
  SERVICE_WORKER_REPLAY: 'cd8',
};


const assetUrlParts = [
  new RegExp('^' + location.origin),
  /^https?:\/\/www\.google-analytics\.com\/analytics\.js/,
];


const cacheAnalyticsJs = async (cache) => {
  let analyticsJsUrl = 'https://www.google-analytics.com/analytics.js';
  let analyticsJsRequest = new Request(analyticsJsUrl, {mode: 'no-cors'});
  let analyticsJsResponse = await fetch(analyticsJsRequest);
  return cache.put(analyticsJsRequest, analyticsJsResponse.clone());
};


const cacheInitialAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  return Promise.all([
    cacheAnalyticsJs(cache),
    cache.addAll([
      '/',
      MAIN_CSS_URL,
      MAIN_JS_URL,
      MAIN_RUNTIME_URL,
    ]),
  ]);
};


const addToCache = async (request, networkResponseClone) => {
  const cache = await caches.open(CACHE_NAME);
  return cache.put(request, networkResponseClone);
};


const getCacheResponse = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  return cachedResponse;
};


self.addEventListener('fetch', (event) => {
  if (assetUrlParts.some((part) => part.test(event.request.url))) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        event.waitUntil(addToCache(event.request, networkResponse.clone()));
        return networkResponse;
      } catch (err) {
        const cacheResponse = await getCacheResponse(event.request);
        return cacheResponse || err;
      }
    })());
  }
});


self.addEventListener('install', (event) => {
  event.waitUntil(cacheInitialAssets());
});


self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


offlineGoogleAnalytics.initialize({
  parameterOverrides: {[dimensions.SERVICE_WORKER_REPLAY]: 'replay'},
});
