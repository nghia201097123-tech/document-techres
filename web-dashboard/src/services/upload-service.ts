import { apiUpload, GATEWAY_URL } from "./api";

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

export interface FileInfo {
  shortCode: string;
  url: string;
  objectName: string;
  shortUrl: string;
  createdAt: string;
}

export interface PresignedUrlResponse {
  url: string;
  expiresIn: number;
  objectName: string;
}

/**
 * Upload Service - Dịch vụ upload file (api-upload microservice via APISIX Gateway)
 * Tất cả endpoint đều có prefix /api/uploads/
 */
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
      timeout: 120000,
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
   * Upload một video
   * api-upload endpoint: /api/uploads/video
   */
  uploadVideo: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult>("/uploads/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Upload một tài liệu (PDF, Word, Excel...)
   * api-upload endpoint: /api/uploads/document
   */
  uploadDocument: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult>("/uploads/document", formData, {
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
   * Upload nhiều file (tối đa 10 file)
   * api-upload endpoint: /api/uploads/multiple
   */
  uploadMultiple: async (files: File[], folder?: string): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const params = folder ? { folder } : {};
    const response = await apiUpload.post<UploadResult[]>("/uploads/multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Lấy thông tin file từ short code
   * api-upload endpoint: /api/uploads/info/:shortCode
   */
  getFileInfo: async (shortCode: string): Promise<FileInfo> => {
    const response = await apiUpload.get<FileInfo>(`/api/uploads/info/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo short code
   * api-upload endpoint: /api/uploads/s/:shortCode
   */
  deleteByShortCode: async (shortCode: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiUpload.delete<{ success: boolean; message: string }>(`/api/uploads/s/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo object name
   * api-upload endpoint: /api/uploads/file/:objectName
   */
  deleteByObjectName: async (objectName: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiUpload.delete<{ success: boolean; message: string }>(`/api/uploads/file/${encodeURIComponent(objectName)}`);
    return response.data;
  },

  /**
   * Lấy URL truy cập có thời hạn (presigned URL)
   * api-upload endpoint: /api/uploads/presigned/:objectName
   */
  getPresignedUrl: async (objectName: string, expiry?: number): Promise<PresignedUrlResponse> => {
    const params = expiry ? { expiry } : {};
    const response = await apiUpload.get<PresignedUrlResponse>(`/api/uploads/presigned/${encodeURIComponent(objectName)}`, { params });
    return response.data;
  },

  /**
   * Kiểm tra trạng thái service
   * api-upload endpoint: /api/uploads/health
   */
  healthCheck: async (): Promise<{ status: string; service: string; timestamp: string }> => {
    const response = await apiUpload.get<{ status: string; service: string; timestamp: string }>("/uploads/health");
    return response.data;
  },

  // ==================== Helper Functions ====================

  /**
   * Tạo URL đầy đủ cho short code (để hiển thị)
   */
  getShortUrl: (shortCode: string): string => {
    return `${GATEWAY_URL}/api/uploads/s/${shortCode}`;
  },

  isImage: (file: File): boolean => file.type.startsWith("image/"),
  isVideo: (file: File): boolean => file.type.startsWith("video/"),
  checkFileSize: (file: File, maxSizeMB: number): boolean => file.size <= maxSizeMB * 1024 * 1024,

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  getExtension: (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  },

  isAllowedExtension: (filename: string, allowedExtensions: string[]): boolean => {
    const ext = uploadService.getExtension(filename);
    return allowedExtensions.includes(ext);
  },
};
