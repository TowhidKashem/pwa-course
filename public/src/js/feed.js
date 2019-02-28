var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
);
var sharedMomentsArea = document.querySelector('#shared-moments');
function closeCreatePostModal() {
  createPostArea.style.transform = 'translateY(100vh)';
}
shareImageButton.addEventListener('click', openCreatePostModal);
closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

const form = document.querySelector('form');
const titleInput = document.querySelector('#title');
const locationInput = document.querySelector('#location');

function sendData(post) {
  fetch('https://us-central1-pwagram-ec297.cloudfunctions.net/storePostData', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(post)
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
    image:
      'https://www.catster.com/wp-content/uploads/2017/08/A-fluffy-cat-looking-funny-surprised-or-concerned.jpg'
  };

  // If a post was submitted when there was no internet connection, queue it for later sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
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

  if (defferedPrompt) {
    defferedPrompt.prompt();

    defferedPrompt.userChoice.then(choiceResult => {
      console.log(choiceResult.outcome);

      if (choiceResult.outcome === 'dismissed') {
        console.log('User cancelled installation');
      } else {
        console.log('User added to homescreen');
      }
    });

    defferedPrompt = null;
  }

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
