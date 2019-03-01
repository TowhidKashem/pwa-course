const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const webpush = require('web-push');

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

const serviceAccount = require('./pwagram-fb-key.json');

admin.initializeApp({
  credentials: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-ec297.firebaseio.com/'
});

// Middleware endpoint that needed to be set up to intercept and return a custom response
// so we can return and ID to delete the post in the queue set up as a background sync task
exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    admin
      .database()
      .ref('posts')
      .push({
        id: request.body.id,
        title: request.body.title,
        location: request.body.location,
        image: request.body.image
      })
      .then(() => {
        webpush.setVapidDetails(
          'mailto:foo@bar.com', // your email address
          'BLTKXRXVqFGoEIffVm3_NZYmickzGW19oEnupesF8pm0EiBPToOzkoasBRC6xOz5_mrtIl-FjvCSPeVDkf_esN0', // your public key
          'L0yKXh-GyDvhh2aAjMfYHi0cU4djrw2BY3WgH0pTCkM' // your private key
        );

        // Get all push notification subscriptions from the database
        return admin
          .database()
          .ref('subscriptions')
          .once('value');
      })
      .then(subscriptions => {
        subscriptions.forEach(sub => {
          let pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth.val,
              p256dh: sub.val().keys.auth.val.p256dh
            }
          };

          // Send notification with payload
          // eslint-disable-next-line promise/no-nesting
          webpush
            .sendNotification(
              pushConfig,
              JSON.stringify({
                title: 'New Post Notification',
                content: 'New Post Added!'
              })
            )
            .catch(err => console.log(err)); // Notification failed to send
        });

        return response.status(201).json({
          message: 'Data Stored',
          id: request.body.id
        });
      })
      .catch(err => {
        return response.status(500).json({
          error: err
        });
      });
  });
});
