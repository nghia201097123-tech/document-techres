import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';
import { UploadedFile, UploadedFileType } from '../../database/entities/uploaded-file.entity';

export interface UploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  bucket: string;
  objectName: string;
  url: string;
  shortUrl: string;
  shortCode: string;
}

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

@Injectable()
export class UploadsService {
  private minioClient: Minio.Client;
  private bucketName: string;
  private baseUrl: string;

  // Allowed MIME types
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  private readonly allowedVideoTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
  ];

  private readonly allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly maxVideoSize = 100 * 1024 * 1024; // 100MB
  private readonly maxDocumentSize = 50 * 1024 * 1024; // 50MB

  constructor(
    private configService: ConfigService,
    @InjectRepository(UploadedFile)
    private readonly uploadedFileRepository: Repository<UploadedFile>,
  ) {
    const endpoint = this.configService.get<string>('CONFIG_MINIO_ENDPOINT', 's3.techres.vn');
    const port = parseInt(this.configService.get<string>('CONFIG_MINIO_PORT', '443'), 10);
    const useSSL = this.configService.get<string>('CONFIG_MINIO_ENABLE_SSL', 'true') === 'true';
    const accessKey = this.configService.get<string>('CONFIG_MINIO_ACCESSKEY');
    const secretKey = this.configService.get<string>('CONFIG_MINIO_SECRETKEY');

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.bucketName = this.configService.get<string>('CONFIG_MINIO_BUCKET', 'techres-uploads');
    this.baseUrl = `https://${endpoint}/${this.bucketName}`;

    // Ensure bucket exists
    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        // Set bucket policy to public read
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  private getFileType(mimeType: string): FileType {
    if (this.allowedImageTypes.includes(mimeType)) return FileType.IMAGE;
    if (this.allowedVideoTypes.includes(mimeType)) return FileType.VIDEO;
    if (this.allowedDocumentTypes.includes(mimeType)) return FileType.DOCUMENT;
    return FileType.OTHER;
  }

  private getUploadedFileType(mimeType: string): UploadedFileType {
    if (this.allowedImageTypes.includes(mimeType)) return UploadedFileType.IMAGE;
    if (this.allowedVideoTypes.includes(mimeType)) return UploadedFileType.VIDEO;
    if (this.allowedDocumentTypes.includes(mimeType)) return UploadedFileType.DOCUMENT;
    return UploadedFileType.OTHER;
  }

  private validateFile(file: Express.Multer.File, allowedTypes?: FileType[]): void {
    const fileType = this.getFileType(file.mimetype);

    // Check if file type is allowed
    if (allowedTypes && !allowedTypes.includes(fileType) && fileType !== FileType.OTHER) {
      throw new BadRequestException(`Loại file không được phép. Chỉ chấp nhận: ${allowedTypes.join(', ')}`);
    }

    // Check file size based on type
    let maxSize: number;
    switch (fileType) {
      case FileType.IMAGE:
        maxSize = this.maxImageSize;
        if (!this.allowedImageTypes.includes(file.mimetype)) {
          throw new BadRequestException('Định dạng hình ảnh không hợp lệ');
        }
        break;
      case FileType.VIDEO:
        maxSize = this.maxVideoSize;
        if (!this.allowedVideoTypes.includes(file.mimetype)) {
          throw new BadRequestException('Định dạng video không hợp lệ');
        }
        break;
      case FileType.DOCUMENT:
        maxSize = this.maxDocumentSize;
        if (!this.allowedDocumentTypes.includes(file.mimetype)) {
          throw new BadRequestException('Định dạng tài liệu không hợp lệ');
        }
        break;
      default:
        maxSize = this.maxDocumentSize;
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File quá lớn. Kích thước tối đa: ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }
  }

  private generateShortCode(): string {
    // Generate a short 8-character code
    return crypto.randomBytes(4).toString('hex');
  }

  private generateObjectName(file: Express.Multer.File, folder?: string): string {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = uuidv4();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const basePath = folder ? `${folder}/${year}/${month}` : `uploads/${year}/${month}`;
    return `${basePath}/${uuid}${ext}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    allowedTypes?: FileType[],
    tenantId?: string,
    uploadedBy?: string,
  ): Promise<UploadResult> {
    this.validateFile(file, allowedTypes);

    const objectName = this.generateObjectName(file, folder);
    const shortCode = this.generateShortCode();

    try {
      // Upload to MinIO
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'x-amz-acl': 'public-read',
        },
      );

      const fullUrl = `${this.baseUrl}/${objectName}`;

      // Save to database
      const uploadedFile = this.uploadedFileRepository.create({
        tenantId,
        originalName: file.originalname,
        fileName: path.basename(objectName),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileType: this.getUploadedFileType(file.mimetype),
        bucket: this.bucketName,
        objectName: objectName,
        fullUrl: fullUrl,
        shortCode: shortCode,
        folder: folder,
        uploadedBy: uploadedBy,
        isPublic: true,
      });

      const saved = await this.uploadedFileRepository.save(uploadedFile);

      return {
        id: saved.id,
        originalName: file.originalname,
        fileName: path.basename(objectName),
        mimeType: file.mimetype,
        size: file.size,
        bucket: this.bucketName,
        objectName: objectName,
        url: fullUrl,
        shortUrl: `/api/uploads/s/${shortCode}`,
        shortCode: shortCode,
      };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new InternalServerErrorException('Không thể upload file. Vui lòng thử lại.');
    }
  }

  async uploadImage(file: Express.Multer.File, folder?: string, tenantId?: string, uploadedBy?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'images', [FileType.IMAGE], tenantId, uploadedBy);
  }

  async uploadVideo(file: Express.Multer.File, folder?: string, tenantId?: string, uploadedBy?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'videos', [FileType.VIDEO], tenantId, uploadedBy);
  }

  async uploadDocument(file: Express.Multer.File, folder?: string, tenantId?: string, uploadedBy?: string): Promise<UploadResult> {
    return this.uploadFile(file, folder || 'documents', [FileType.DOCUMENT], tenantId, uploadedBy);
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder?: string,
    allowedTypes?: FileType[],
    tenantId?: string,
    uploadedBy?: string,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file, folder, allowedTypes, tenantId, uploadedBy);
      results.push(result);
    }
    return results;
  }

  async getFullUrl(shortCode: string): Promise<string | null> {
    const file = await this.uploadedFileRepository.findOne({
      where: { shortCode },
    });
    return file?.fullUrl || null;
  }

  async getFileByShortCode(shortCode: string): Promise<UploadedFile | null> {
    return this.uploadedFileRepository.findOne({
      where: { shortCode },
    });
  }

  async deleteFile(objectName: string): Promise<boolean> {
    try {
      // Delete from MinIO
      await this.minioClient.removeObject(this.bucketName, objectName);

      // Delete from database
      await this.uploadedFileRepository.delete({ objectName });

      return true;
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      return false;
    }
  }

  async deleteByShortCode(shortCode: string): Promise<boolean> {
    const file = await this.uploadedFileRepository.findOne({
      where: { shortCode },
    });

    if (!file) {
      throw new NotFoundException('Không tìm thấy file');
    }

    return this.deleteFile(file.objectName);
  }

  async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, objectName, expirySeconds);
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new InternalServerErrorException('Không thể tạo URL truy cập');
    }
  }

  async getFilesByTenant(tenantId: string, fileType?: UploadedFileType): Promise<UploadedFile[]> {
    const where: any = { tenantId };
    if (fileType) {
      where.fileType = fileType;
    }
    return this.uploadedFileRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }
}
