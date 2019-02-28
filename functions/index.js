const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

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
