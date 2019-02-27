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

//*-----------------------------------------------------------------------------------

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
