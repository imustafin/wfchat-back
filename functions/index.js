const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onMessageCreate = functions
  .database
  .ref('/chats/{room}/{message}')
  .onCreate(async (snapshot, context) => {
    const { room } = context.params;
    const message = snapshot.val();

    const tokens = await admin.database().ref('/tokens/{userId}').once('value');

    if (!tokens.hasChildren()) {
      return console.log('No tokens known');
    }

    const payload = {
      notification: {
        title: 'New message',
        body: message.content
      }
    };

    const tokenStrings = Object.keys(tokens.val());

    const response = await admin.messaging().sendToDevice(tokenStrings, payload);


    // Remove stale tokens

    const staleTokenRemovePromises = [];

    response.results.forEach((result, index) => {
      const { error } = result;
      if (error) {
        console.log('Error sending notification to', tokenStrings[index], error);

        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          staleTokenRemovePromises.push(tokens.ref.child(tokenStrings[index]).remove());
        }
      }
    });

    return Promise.all(staleTokenRemovePromises);
  });
