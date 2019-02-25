if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => {
      console.log('service worker registered!');
    })
    .catch(error => console.error(error));
}
