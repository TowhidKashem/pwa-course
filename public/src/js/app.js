let defferedPrompt;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.advance.js')
    .then(() => console.log('service worker registered!'))
    .catch(error => console.error(error));
}

window.addEventListener('beforeinstallprompt', event => {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  defferedPrompt = event;
  return false;
});
