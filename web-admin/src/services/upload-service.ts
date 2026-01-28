import { apiUpload } from "./api";

export enum FileType {
  IMAGE = "image",
  VIDEO = "video",
  DOCUMENT = "document",
  OTHER = "other",
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

export const uploadService = {
  /**
   * Upload một hình ảnh
   * api-upload endpoint: /api/uploads/image
   */
  uploadImage: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult>("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
      timeout: 120000, // 2 minutes for large files
    });
    return response.data;
  },

  /**
   * Upload nhiều hình ảnh (tối đa 10 file)
   * api-upload endpoint: /api/uploads/images
   */
  uploadImages: async (files: File[], folder?: string): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult[]>("/uploads/images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Upload file bất kỳ
   * api-upload endpoint: /api/uploads/file
   */
  uploadFile: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult>("/uploads/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Kiểm tra file có phải là hình ảnh không
   */
  isImage: (file: File): boolean => {
    return file.type.startsWith("image/");
  },

  /**
   * Kiểm tra kích thước file (MB)
   */
  checkFileSize: (file: File, maxSizeMB: number): boolean => {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  /**
   * Format kích thước file cho hiển thị
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};
