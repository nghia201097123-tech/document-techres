import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';
import { MinioService } from './minio.service';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export interface UploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileType: FileType;
  objectName: string;
  url: string;
  shortCode: string;
  shortUrl: string;
}

// In-memory storage for short URLs (in production, use Redis or Database)
const shortUrlStore = new Map<string, { url: string; objectName: string; createdAt: Date }>();

@Injectable()
export class UploadsService {
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ];

  private readonly allowedVideoTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
  ];

  private readonly allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];

  // Default limits (can be overridden by env)
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly maxVideoSize = 100 * 1024 * 1024; // 100MB
  private readonly maxDocumentSize = 50 * 1024 * 1024; // 50MB

  constructor(private readonly minioService: MinioService) {}

  /**
   * Determine file type from MIME type
   */
  private getFileType(mimeType: string): FileType {
    if (this.allowedImageTypes.includes(mimeType)) return FileType.IMAGE;
    if (this.allowedVideoTypes.includes(mimeType)) return FileType.VIDEO;
    if (this.allowedDocumentTypes.includes(mimeType)) return FileType.DOCUMENT;
    return FileType.OTHER;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File, allowedTypes?: FileType[]): FileType {
    if (!file || !file.buffer) {
      throw new BadRequestException('File không hợp lệ');
    }

    const fileType = this.getFileType(file.mimetype);

    // Check allowed types
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(fileType)) {
      throw new BadRequestException(
        `Loại file không được phép. Chỉ chấp nhận: ${allowedTypes.join(', ')}`,
      );
    }

    // Check size limits
    let maxSize: number;
    let typeName: string;

    switch (fileType) {
      case FileType.IMAGE:
        maxSize = this.maxImageSize;
        typeName = 'Hình ảnh';
        break;
      case FileType.VIDEO:
        maxSize = this.maxVideoSize;
        typeName = 'Video';
        break;
      case FileType.DOCUMENT:
        maxSize = this.maxDocumentSize;
        typeName = 'Tài liệu';
        break;
      default:
        maxSize = this.maxDocumentSize;
        typeName = 'File';
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `${typeName} quá lớn. Kích thước tối đa: ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }

    return fileType;
  }

  /**
   * Generate short code for URL
   */
  private generateShortCode(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * Generate object name for storage
   */
  private generateObjectName(file: Express.Multer.File, folder?: string): string {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = uuidv4();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const basePath = folder || 'uploads';
    return `${basePath}/${year}/${month}/${day}/${uuid}${ext}`;
  }

  /**
   * Upload a single file
   */
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    allowedTypes?: FileType[],
  ): Promise<UploadResult> {
    const fileType = this.validateFile(file, allowedTypes);
    const objectName = this.generateObjectName(file, folder);
    const shortCode = this.generateShortCode();

    // Upload to MinIO
    const url = await this.minioService.uploadFile(
      objectName,
      file.buffer,
      file.size,
      file.mimetype,
    );

    // Store short URL mapping
    shortUrlStore.set(shortCode, {
      url,
      objectName,
      createdAt: new Date(),
    });

    return {
      id: uuidv4(),
      originalName: file.originalname,
      fileName: path.basename(objectName),
      mimeType: file.mimetype,
      size: file.size,
      fileType,
      objectName,
      url,
      shortCode,
      shortUrl: `/api/uploads/s/${shortCode}`,
    };
  }

  /**
   * Upload an image
   */
  async uploadImage(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'images', [FileType.IMAGE]);
  }

  /**
   * Upload a video
   */
  async uploadVideo(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'videos', [FileType.VIDEO]);
  }

  /**
   * Upload a document
   */
  async uploadDocument(file: Express.Multer.File, folder?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'documents', [FileType.DOCUMENT]);
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    folder?: string,
    allowedTypes?: FileType[],
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file, folder, allowedTypes);
      results.push(result);
    }
    return results;
  }

  /**
   * Get full URL from short code
   */
  getFullUrl(shortCode: string): string | null {
    const entry = shortUrlStore.get(shortCode);
    return entry?.url || null;
  }

  /**
   * Get file info from short code
   */
  getFileInfo(shortCode: string): { url: string; objectName: string; createdAt: Date } | null {
    return shortUrlStore.get(shortCode) || null;
  }

  /**
   * Delete file by short code
   */
  async deleteByShortCode(shortCode: string): Promise<boolean> {
    const entry = shortUrlStore.get(shortCode);
    if (!entry) {
      throw new NotFoundException('Không tìm thấy file');
    }

    await this.minioService.deleteFile(entry.objectName);
    shortUrlStore.delete(shortCode);
    return true;
  }

  /**
   * Delete file by object name
   */
  async deleteByObjectName(objectName: string): Promise<boolean> {
    await this.minioService.deleteFile(objectName);

    // Remove from short URL store if exists
    for (const [code, entry] of shortUrlStore.entries()) {
      if (entry.objectName === objectName) {
        shortUrlStore.delete(code);
        break;
      }
    }

    return true;
  }

  /**
   * Get presigned URL for temporary access
   */
  async getPresignedUrl(objectName: string, expirySeconds?: number): Promise<string> {
    return this.minioService.getPresignedUrl(objectName, expirySeconds || 3600);
  }
}
