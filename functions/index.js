const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// Every app notification is a doc in `notifications` (written by the client, see src/lib/notifications.ts).
// This turns it into an FCM push for each device token saved on users/{to}.fcmTokens.
exports.sendPush = onDocumentCreated('notifications/{id}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const n = snap.data();
  const userRef = getFirestore().doc(`users/${n.to}`);
  const tokens = ((await userRef.get()).data() || {}).fcmTokens || [];
  if (!tokens.length) {
    console.log(`no fcmTokens for user ${n.to} (${n.type})`);
    await snap.ref.update({ status: 'failed' });
    return;
  }

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: n.title, body: n.body },
    data: { type: String(n.type || ''), relatedId: String(n.relatedId || '') },
    android: { priority: 'high' },
  });

  console.log(
    `push to ${n.to} (${n.type}): ${res.successCount}/${tokens.length} ok`,
    res.responses.filter((r) => r.error).map((r) => r.error.code)
  );

  // Drop tokens that are no longer valid (app uninstalled / token rotated).
  const dead = tokens.filter((_, i) =>
    ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(
      res.responses[i].error && res.responses[i].error.code
    )
  );
  if (dead.length) await userRef.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
  await snap.ref.update({ status: res.successCount > 0 ? 'sent' : 'failed' });
});
