let defferedPrompt;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.advance.js')
    .then(() => console.log('service worker registered!'))
    .catch(error => console.error(error));
}

// Delaying add to homepage banner
window.addEventListener('beforeinstallprompt', event => {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  defferedPrompt = event;
  return false;
});

// Notifications
function displayConfirmNotification() {
  new Notification('Successfully Subscribed!');
}

function askForNotificationPermission() {
  Notification.requestPermission(result => {
    console.log('User Choice:', result);

    if (result !== 'granted') {
      console.log('No notification permission granted!');
    } else {
      console.log('User choice is granted!');
      displayConfirmNotification();
    }
  });
}

if ('Notification' in window) {
  const notificationBtns = document.querySelectorAll('.enable-notifications');

  notificationBtns.forEach(btn => {
    btn.classList.add('show');
    btn.addEventListener('click', askForNotificationPermission);
  });
}
