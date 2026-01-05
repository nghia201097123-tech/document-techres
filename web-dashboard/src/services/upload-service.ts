import axios from "axios";

// Upload service base URL - separate microservice
const UPLOAD_API_URL = process.env.NEXT_PUBLIC_UPLOAD_API_URL || "http://localhost:3003/api";

// Create axios instance for upload service
const uploadApi = axios.create({
  baseURL: UPLOAD_API_URL,
  timeout: 120000, // 2 minutes for large files
});

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
 * Upload Service - Dịch vụ upload file riêng biệt (api-upload microservice)
 *
 * Sử dụng:
 * - uploadService.uploadImage(file) - Upload 1 hình ảnh
 * - uploadService.uploadImages(files) - Upload nhiều hình ảnh
 * - uploadService.uploadVideo(file) - Upload video
 * - uploadService.uploadDocument(file) - Upload tài liệu
 * - uploadService.uploadFile(file) - Upload file bất kỳ
 *
 * Response trả về:
 * - url: URL đầy đủ trên MinIO
 * - shortUrl: /api/uploads/s/{shortCode}
 * - shortCode: Mã ngắn để truy cập file
 */
export const uploadService = {
  /**
   * Upload một hình ảnh
   * @param file File hình ảnh (jpeg, png, gif, webp, svg) - Max 10MB
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadImage: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult>("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Upload nhiều hình ảnh (tối đa 10 file)
   * @param files Danh sách file hình ảnh
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadImages: async (files: File[], folder?: string): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult[]>("/uploads/images", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Upload một video
   * @param file File video (mp4, webm, ogg...) - Max 100MB
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadVideo: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult>("/uploads/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Upload một tài liệu (PDF, Word, Excel...)
   * @param file File tài liệu - Max 50MB
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadDocument: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult>("/uploads/document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Upload file bất kỳ
   * @param file File cần upload
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadFile: async (file: File, folder?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult>("/uploads/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Upload nhiều file (tối đa 10 file)
   * @param files Danh sách file
   * @param folder Thư mục lưu trữ (tùy chọn)
   */
  uploadMultiple: async (files: File[], folder?: string): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const params = folder ? { folder } : {};
    const response = await uploadApi.post<UploadResult[]>("/uploads/multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params,
    });
    return response.data;
  },

  /**
   * Lấy thông tin file từ short code
   * @param shortCode Mã ngắn của file
   */
  getFileInfo: async (shortCode: string): Promise<FileInfo> => {
    const response = await uploadApi.get<FileInfo>(`/uploads/info/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo short code
   * @param shortCode Mã ngắn của file
   */
  deleteByShortCode: async (shortCode: string): Promise<{ success: boolean; message: string }> => {
    const response = await uploadApi.delete<{ success: boolean; message: string }>(`/uploads/s/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo object name
   * @param objectName Tên object trên MinIO
   */
  deleteByObjectName: async (objectName: string): Promise<{ success: boolean; message: string }> => {
    const response = await uploadApi.delete<{ success: boolean; message: string }>(`/uploads/file/${encodeURIComponent(objectName)}`);
    return response.data;
  },

  /**
   * Lấy URL truy cập có thời hạn (presigned URL)
   * @param objectName Tên object trên MinIO
   * @param expiry Thời gian hết hạn (giây), mặc định 3600 (1 giờ)
   */
  getPresignedUrl: async (objectName: string, expiry?: number): Promise<PresignedUrlResponse> => {
    const params = expiry ? { expiry } : {};
    const response = await uploadApi.get<PresignedUrlResponse>(`/uploads/presigned/${encodeURIComponent(objectName)}`, { params });
    return response.data;
  },

  /**
   * Kiểm tra trạng thái service
   */
  healthCheck: async (): Promise<{ status: string; service: string; timestamp: string }> => {
    const response = await uploadApi.get<{ status: string; service: string; timestamp: string }>("/uploads/health");
    return response.data;
  },

  // ==================== Helper Functions ====================

  /**
   * Tạo URL đầy đủ cho short code (để hiển thị)
   * @param shortCode Mã ngắn của file
   */
  getShortUrl: (shortCode: string): string => {
    return `${UPLOAD_API_URL}/uploads/s/${shortCode}`;
  },

  /**
   * Kiểm tra file có phải là hình ảnh không
   * @param file File cần kiểm tra
   */
  isImage: (file: File): boolean => {
    return file.type.startsWith("image/");
  },

  /**
   * Kiểm tra file có phải là video không
   * @param file File cần kiểm tra
   */
  isVideo: (file: File): boolean => {
    return file.type.startsWith("video/");
  },

  /**
   * Kiểm tra kích thước file (MB)
   * @param file File cần kiểm tra
   * @param maxSizeMB Kích thước tối đa (MB)
   */
  checkFileSize: (file: File, maxSizeMB: number): boolean => {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  /**
   * Format kích thước file cho hiển thị
   * @param bytes Kích thước (bytes)
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Lấy extension từ tên file
   * @param filename Tên file
   */
  getExtension: (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  },

  /**
   * Kiểm tra extension có được phép không
   * @param filename Tên file
   * @param allowedExtensions Danh sách extension được phép
   */
  isAllowedExtension: (filename: string, allowedExtensions: string[]): boolean => {
    const ext = uploadService.getExtension(filename);
    return allowedExtensions.includes(ext);
  },
};
