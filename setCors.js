import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: './serviceAccountKey.json'
});

const bucketName = 'nexcivic-49dbe.firebasestorage.app';
const bucket = storage.bucket(bucketName);

const corsConfiguration = [
  {
    origin: ['*'],
    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable']
  }
];

async function configureBucketCors() {
  try {
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log(`CORS configured successfully for bucket ${bucketName}`);
  } catch (error) {
    console.error(`Error configuring CORS: ${error.message}`);
  }
}

configureBucketCors();
