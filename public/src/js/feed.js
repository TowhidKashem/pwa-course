var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
);
var sharedMomentsArea = document.querySelector('#shared-moments');

function closeCreatePostModal() {
  // Clean up
  createPostArea.style.transform = 'translateY(100vh)';
  imagePickerContainer.style.display = 'none';
  videoPlayer.style.display = 'none';
  canvasElement.style.display = 'none';
}

shareImageButton.addEventListener('click', openCreatePostModal);
closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

const form = document.querySelector('form');
const titleInput = document.querySelector('#title');
const locationInput = document.querySelector('#location');

const videoPlayer = document.querySelector('#player');
const canvasElement = document.querySelector('#canvas');
const captureBtn = document.querySelector('#capture-btn');
const imagePicker = document.querySelector('#image-picker');
const imagePickerContainer = document.querySelector('#pick-image');
let myPicture;

//*---------------- Notifications ----------------*//

// [Native Feature]: Camera Access
function intializeMedia() {
  // Polyfill for older browsers/devices that don't support `getUserMedia()`
  // May not be nessecary since the latest versions of Android Chrome and IOS Safari both do
  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }
  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = constraints => {
      const getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia() is not implemented!'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // Ask for permission then display stream to canvas
  navigator.mediaDevices
    .getUserMedia({
      video: true
      // audio: true
    })
    .then(stream => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = 'block';
    })
    .catch(err => {
      // Show manual file uploader fallback (progressive enhancement)
      imagePickerContainer.style.display = 'block';
    });

  // Take pic from webcam
  captureBtn.addEventListener('click', event => {
    canvasElement.style.display = 'block';
    videoPlayer.style.display = 'none';
    captureBtn.style.display = 'none';

    const context = canvasElement.getContext('2d');
    context.drawImage(
      videoPlayer,
      0,
      0,
      canvasElement.width,
      videoPlayer.videoHeight / (videoPlayer.videoWidth / canvasElement.width)
    );

    // Stop the webcam after the pic is taken, just hiding it won't get rid of the light on the webcam indicating it's stil running
    videoPlayer.srcObject.getVideoTracks().forEach(track => track.stop());

    myPicture = _dataURItoBlob(canvasElement.toDataURL());

    // File uploader fallback
    imagePicker.addEventListener('change', event => {
      picture = event.target.files[0];
    });
  });
}

//*------------------------------------------------------------------------

function sendData(post) {
  const postData = new FormData();
  postData.append('id', post.id);
  postData.append('title', post.title);
  postData.append('location', post.location);
  postData.append('file', myPicture, `${post.id}.png`); // 3rd param allows you to override the name of the image

  fetch('https://us-central1-pwagram-ec297.cloudfunctions.net/storePostData', {
    method: 'POST',
    body: postData
  }).then(response => {
    console.log('Sent Data:', response);
    fetchPosts();
  });
}

// Create new post
form.addEventListener('submit', e => {
  e.preventDefault();

  // Form validation
  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter all fields!');
    return;
  }

  // Close popup
  closeCreatePostModal();

  const post = {
    id: new Date().toISOString(),
    title: titleInput.value,
    location: locationInput.value,
    image: myPicture
  };

  // If a post was submitted when there was no internet connection, queue it for later sync
  if (
    !navigator.onLine &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  ) {
    navigator.serviceWorker.ready.then(sw => {
      // Write to IndexedDB so when the task starts it knows where to get data from
      writeData('sync-posts', post).then(() => {
        // Register the task if the write was successful
        // `sync-new-posts` = unique name for the sync task, it will be referenced in the service worker file
        sw.sync
          .register('sync-new-posts')
          .then(() => {
            // If successful show user feedback message
            const snackBarContainer = document.querySelector(
              '#confirmation-toast'
            );
            snackBarContainer.MaterialSnackbar.showSnackbar({
              message: 'You Post Was Saved for Syncing!'
            });
          })
          .catch(err => console.log(err));
      });
    });
  }
  // Standard form submit over network fall back for non supportive browsers
  else {
    sendData(post);
  }
});

// Open popup
function openCreatePostModal() {
  createPostArea.style.transform = 'translateY(0)';

  intializeMedia();

  // // Show deffered add to home screen at a custom time example
  // if (defferedPrompt) {
  //   defferedPrompt.prompt();

  //   defferedPrompt.userChoice.then(choiceResult => {
  //     console.log(choiceResult.outcome);

  //     if (choiceResult.outcome === 'dismissed') {
  //       console.log('User cancelled installation');
  //     } else {
  //       console.log('User added to homescreen');
  //     }
  //   });

  //   defferedPrompt = null;
  // }

  // // Unregister all service workers programatically
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.getRegistrations().then(registrations => {
  //     registrations.forEach(registration => registration.unregister());
  //   });
  // }
}

// On Demand Caching Upon a User Event
// Use Case: Offer the user a button called "save for reading article offline"
function onSaveButtonClick(e) {
  if ('caches' in window) {
    caches.open('user-requested').then(cache => {
      cache.addAll(['https://httpbin.org/get', '/src/images/sf-boat.jpg']);
    });
  }
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(post) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = `url(${post.image})`;
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.backgroundPosition = 'center';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.style.color = '#fff';
  cardTitleTextElement.textContent = post.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = post.location;
  cardSupportingText.style.textAlign = 'center';
  // var cardSaveButton = document.createElement('button');
  // cardSaveButton.textContent = 'Save';
  // cardSaveButton.addEventListener('click', onSaveButtonClick);
  // cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

// Name: Cache then Network Strategy
const url = 'https://pwagram-ec297.firebaseio.com/posts.json';
let networkDataRecieved = false; // Flag to make sure cache never replaces network data in case the network is faster than the cache
fetchPosts();

function fetchPosts() {
  // Fetch from network
  fetch(url)
    .then(res => res.json())
    .then(posts => {
      console.warn('From Network:', posts);

      networkDataRecieved = true;
      clearCards();
      for (let key in posts) {
        createCard(posts[key]);
      }
    });

  // Fetch from indexedDB cache
  if ('indexedDB' in window) {
    readData('posts').then(posts => {
      if (!networkDataRecieved) {
        console.warn('From IndexedDB Cache:', posts);

        clearCards();
        for (let key in posts) {
          createCard(posts[key]);
        }
      }
    });
    // caches
    //   .match(url)
    //   .then(response => {
    //     if (response) {
    //       return response.json();
    //     }
    //   })
    //   .then(posts => {
    //     if (!networkDataRecieved) {
    //       console.log('From Cache:', posts);

    //       for (let i in posts) {
    //         createCard(posts[i]);
    //       }
    //     }
    //   });
  }
}
