const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ keyFilename: './serviceAccountKey.json' });

const corsConfiguration = [
  {
    origin: ["*"],
    method: ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    maxAgeSeconds: 3600,
    responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
];

async function setCors() {
  try {
    const bucket = storage.bucket("nexcivic-49dbe.appspot.com");
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log("Successfully set CORS policy on nexcivic-49dbe.appspot.com!");
  } catch (err) {
    console.error("Failed to set CORS on appspot.com:", err.message);
    
    console.log("Trying nexcivic-49dbe.firebasestorage.app...");
    try {
        const bucket2 = storage.bucket("nexcivic-49dbe.firebasestorage.app");
        await bucket2.setCorsConfiguration(corsConfiguration);
        console.log("Successfully set CORS policy on nexcivic-49dbe.firebasestorage.app!");
    } catch (err2) {
        console.error("Failed to set CORS on firebasestorage.app:", err2.message);
    }
  }
}

setCors();
