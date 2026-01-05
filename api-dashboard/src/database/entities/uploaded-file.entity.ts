import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UploadedFileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

@Entity('uploaded_files')
export class UploadedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'file_type', type: 'enum', enum: UploadedFileType, default: UploadedFileType.OTHER })
  fileType: UploadedFileType;

  @Column({ name: 'bucket' })
  bucket: string;

  @Column({ name: 'object_name' })
  objectName: string;

  @Column({ name: 'full_url', type: 'text' })
  fullUrl: string;

  @Index('idx_uploaded_files_short_code', { unique: true })
  @Column({ name: 'short_code', length: 16 })
  shortCode: string;

  @Column({ name: 'folder', nullable: true })
  folder: string;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
