const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let client = null;

const getClient = () => {
  if (client) return client;
  if (!process.env.STORAGE_ENDPOINT) return null;
  client = new S3Client({
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
      secretAccessKey: process.env.STORAGE_SECRET_KEY || ''
    }
  });
  return client;
};

const isConfigured = () => !!process.env.STORAGE_ENDPOINT;

const uploadFile = async (key, body, contentType = 'application/octet-stream') => {
  const c = getClient();
  if (!c) throw new Error('R2 not configured');
  await c.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
  const publicUrl = process.env.STORAGE_PUBLIC_URL;
  return publicUrl ? `${publicUrl}/${key}` : null;
};

const uploadText = async (key, text) => {
  return uploadFile(key, Buffer.from(text, 'utf-8'), 'text/plain');
};

const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const c = getClient();
  if (!c) return null;
  return getSignedUrl(c, new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key
  }), { expiresIn });
};

const deleteFile = async (key) => {
  const c = getClient();
  if (!c) return;
  await c.send(new DeleteObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: key }));
};

const listFiles = async (prefix) => {
  const c = getClient();
  if (!c) return [];
  const result = await c.send(new ListObjectsV2Command({
    Bucket: process.env.STORAGE_BUCKET,
    Prefix: prefix
  }));
  return result.Contents || [];
};

module.exports = { uploadFile, uploadText, getSignedDownloadUrl, deleteFile, listFiles, isConfigured };
