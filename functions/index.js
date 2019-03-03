/* eslint handle-callback-err: 0 */
var functions = require('firebase-functions');
var admin = require('firebase-admin');
var cors = require('cors')({ origin: true });
var webpush = require('web-push');
var fs = require('fs');
var UUID = require('uuid-v4');
var os = require('os');
var Busboy = require('busboy');
var path = require('path');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

var serviceAccount = require('./pwagram-fb-key.json');

var gcconfig = {
  projectId: 'pwagram-ec297',
  keyFilename: 'pwagram-fb-key.json'
};

var gcs = require('@google-cloud/storage')(gcconfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwagram-ec297.firebaseio.com/'
});

// Middleware endpoint that needed to be set up to intercept and return a custom response
// so we can return and ID to delete the post in the queue set up as a background sync task
exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    var uuid = UUID();

    const busboy = new Busboy({ headers: request.headers });
    // These objects will store the values (file + fields) extracted from busboy
    let upload;
    const fields = {};

    // This callback will be invoked for each file uploaded
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(
        `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
      );
      const filepath = path.join(os.tmpdir(), filename);
      upload = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    // This will invoked on every field detected
    busboy.on(
      'field',
      (
        fieldname,
        val,
        fieldnameTruncated,
        valTruncated,
        encoding,
        mimetype
      ) => {
        fields[fieldname] = val;
      }
    );

    // This callback will be invoked after all uploaded files are saved.
    busboy.on('finish', () => {
      var bucket = gcs.bucket('pwagram-ec297.appspot.com');
      bucket.upload(
        upload.file,
        {
          uploadType: 'media',
          metadata: {
            metadata: {
              contentType: upload.type,
              firebaseStorageDownloadTokens: uuid
            }
          }
        },
        (err, uploadedFile) => {
          // If file upload succeeded, go ahead with the rest of the post saving operation
          if (!err) {
            admin
              .database()
              .ref('posts')
              .push({
                title: fields.title,
                location: fields.location,
                rawLocation: {
                  lat: fields.rawLocationLat,
                  lng: fields.rawLocationLng
                },
                image:
                  'https://firebasestorage.googleapis.com/v0/b/' +
                  bucket.name +
                  '/o/' +
                  encodeURIComponent(uploadedFile.name) +
                  '?alt=media&token=' +
                  uuid
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
                  var pushConfig = {
                    endpoint: sub.val().endpoint,
                    keys: {
                      auth: sub.val().keys.auth,
                      p256dh: sub.val().keys.p256dh
                    }
                  };

                  // Send notification with payload
                  // eslint-disable-next-line promise/no-nesting
                  webpush
                    .sendNotification(
                      pushConfig,
                      JSON.stringify({
                        title: 'New Post',
                        content: 'New Post added!',
                        openUrl: '/help' // Can be called anything, `openUrl` isn't a keyword
                      })
                    )
                    .catch(err => {
                      console.log(err); // Notification failed to send
                    });
                });
                return response
                  .status(201)
                  .json({ message: 'Data stored', id: fields.id });
              })
              .catch(err => {
                response.status(500).json({ error: err });
              });
          } else {
            console.log('Error uploading file!', err);
          }
        }
      );
    });

    // The raw bytes of the upload will be in request.rawBody.  Send it to busboy, and get
    // a callback when it's finished.
    busboy.end(request.rawBody);
    // formData.parse(request, function(err, fields, files) {
    //   fs.rename(files.file.path, "/tmp/" + files.file.name);
    //   var bucket = gcs.bucket("YOUR_PROJECT_ID.appspot.com");
    // });
  });
});
