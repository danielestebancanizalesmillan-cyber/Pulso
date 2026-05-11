import * as admin from "firebase-admin";

const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin SDK is missing credentials. Server-side operations might fail.");
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
};

const app = initFirebaseAdmin();
const adminAuth = app ? admin.auth() : null;

export { app as adminApp, adminAuth };
