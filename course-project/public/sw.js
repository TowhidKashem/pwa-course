if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then(() => {
      console.log('Service worker registered!');
    })
    .error(err => console.warn(err));
}
