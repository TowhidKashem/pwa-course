importScripts('/src/js/idb.js');
importScripts('/src/js/db-setup.js');

// Bump these version numbers each time code for a cache is updated
const STATIC_VERSION = 'v1';
const DYNAMIC_VERSION = 'v1';

// Recursive helper function to delete items off the cache (off the top - oldest items first, you can get as fancy with this algorithm as you ike) if they are greater than a max amount
// On this file we are setting a maxItems count of 3 which is of course very agressive, checkout current browser limits to determine a better number
function _trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    return cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(_trimCache(cacheName.maxItems));
      }
    });
  });
}

// Install gets called once when the service worker is updated
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...', event);

  event.waitUntil(
    caches.open(`static-${STATIC_VERSION}`).then(cache => {
      console.log('[SW] Precaching App Shell');

      // Cache App Shell
      cache.addAll([
        // HTML
        '/',
        '/index.html',
        '/offline.html',
        // JS
        '/src/js/app.js',
        '/src/js/feed.js',
        '/src/js/material.min.js',
        '/src/js/idb.js',
        // CSS
        '/src/css/app.css',
        '/src/css/feed.css',
        // Images
        '/src/images/main-image.jpg',
        // External
        'https://fonts.googleapis.com/css?family=Roboto:400,700',
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
      ]);
    })
  );
});

// Activate gets called once when the service worker is updated
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...', event);

  // Delete outdated caches
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (
            key !== `static-${STATIC_VERSION}` &&
            key !== `dynamic-${DYNAMIC_VERSION}`
          ) {
            console.log('[SW] Removing Old Cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// // Name: Catch With Network Fallback Strategy (ideal for caching static items like js/css)
// // Intercept all fetch requests (this will get triggered not just for fetch API calls from JS but also all images, CSS, JS, etc loaded from HTML)
// self.addEventListener('fetch', event => {
//   // console.log('[SW] Fetching Something...', event);

//   event.respondWith(
//     caches.match(event.request).then(response => {
//       // If resource exists in cache return cached version
//       if (response) {
//         return response;
//       }
//       // Otherwise fetch it from the network as usual
//       else {
//         return (
//           fetch(event.request)
//             .then(response => {
//               return caches.open(`dynamic-${DYNAMIC_VERSION}`).then(cache => {
//                 // Make sure there aren't too many items in the dynamic cache
//                 // _trimCache(`dynamic-${DYNAMIC_VERSION}`, 3);

//                 // After fetching, store in cache
//                 // .put() unlike .add() doesn't make a new request, it simply adds what you already fetched to the cache
//                 // Must use .clone() here because response is empty since it can only be used once, so you must return a cloned copy
//                 cache.put(event.request.url, response.clone());
//                 return response;
//               });
//             })
//             // Show offline message for assets which hasn't been dynamically cached yet but which the user has tried to visit while offline
//             .catch(err => {
//               return caches.open(`static-${STATIC_VERSION}`).then(cache => {
//                 // Check to see if the asset being requested is one of the page routes because it doesn't make sense to send offline message for things like
//                 // unfetched css and js files, etc
//                 if (event.request.headers.get('accept').includes('text/html')) {
//                   return cache.match('/offline.html');
//                 }
//               });
//             })
//         );
//       }
//     })
//   );
// });

// Name: Cache then Network Strategy (ideal for caching dynamic items like frequently updating data streams)
// Display items from the cache as soon as possible, then reach out to the network and update with newer content (if available)
// Gives the illusion of instantaneous load, doesn't work in offline mode
// See `feed.js` for the 1st part of the implementation, and below for the 2nd caching the result after fetching part
self.addEventListener('fetch', event => {
  const url = 'https://pwagram-ec297.firebaseio.com/posts';

  // Use cache then network strategy only for the above url
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clonedResponse = response.clone();

        // Clear db table of all past data
        deleteAllData('posts').then(() => {
          // Write new data to table
          clonedResponse.json().then(data => {
            for (let key in data) {
              writeData('posts', data[key]);
            }
          });
        });

        return response;
      })
    );
  }
  // Use catch with network fallback strategy for everything else
  else {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(response => {
              return caches.open(`dynamic-${DYNAMIC_VERSION}`).then(cache => {
                cache.put(event.request.url, response.clone());
                return response;
              });
            })
            .catch(err => {
              return caches.open(`static-${STATIC_VERSION}`).then(cache => {
                return cache.match('/offline.html');
              });
            });
        }
      })
    );
  }
});

// // Name: Catch only Strategy
// self.addEventListener('fetch', event => {
//   event.respondWith(caches.match(event.request));
// });

// // Name: Network only Strategy
// self.addEventListener('fetch', event => {
//   event.respondWith(fetch(event.request));
// });

// // Name: Network First Then Cache Strategy
// self.addEventListener('fetch', event => {
//   event.respondWith(
//     fetch(event.request).catch(err => {
//       return caches.match(event.request);
//     })
//   );
// });
