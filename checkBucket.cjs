const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require("./serviceAccountKey.json");

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "nexcivic-49dbe.firebasestorage.app"
});

async function findBucket() {
    try {
        const bucket = getStorage(app).bucket();
        await bucket.file("test.txt").save("hello world");
        console.log("Successfully uploaded to", bucket.name);
    } catch(e) {
        console.log("Error uploading to bucket:", e.message);
    }
}
findBucket();
