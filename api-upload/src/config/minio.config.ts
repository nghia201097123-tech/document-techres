import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endpoint: process.env.MINIO_ENDPOINT || 's3.techres.vn',
  port: parseInt(process.env.MINIO_PORT || '443', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
  bucket: process.env.MINIO_BUCKET || 'techres-uploads',
}));

export const uploadLimits = {
  maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10', 10) * 1024 * 1024,
  maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '100', 10) * 1024 * 1024,
  maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '50', 10) * 1024 * 1024,
};
