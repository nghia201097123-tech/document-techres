import api from "./api";

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
  bucket: string;
  objectName: string;
  url: string;
  shortUrl: string;
  shortCode: string;
}

export interface FileInfo {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileType: FileType;
  url: string;
  shortUrl: string;
  shortCode: string;
  createdAt: string;
}

export interface PresignedUrlResponse {
  url: string;
  expiresIn: number;
}

/**
 * Upload Service - Dịch vụ upload file lên MinIO
 *
 * Sử dụng:
 * - uploadService.uploadImage(file) - Upload 1 hình ảnh
 * - uploadService.uploadImages(files) - Upload nhiều hình ảnh
 * - uploadService.uploadVideo(file) - Upload video
 * - uploadService.uploadDocument(file) - Upload tài liệu
 * - uploadService.uploadFile(file) - Upload file bất kỳ
 *
 * Response trả về shortUrl để hiển thị: /api/uploads/s/{shortCode}
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
    const response = await api.post<UploadResult>("/uploads/image", formData, {
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
    const response = await api.post<UploadResult[]>("/uploads/images", formData, {
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
    const response = await api.post<UploadResult>("/uploads/video", formData, {
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
    const response = await api.post<UploadResult>("/uploads/document", formData, {
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
    const response = await api.post<UploadResult>("/uploads/file", formData, {
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
    const response = await api.post<UploadResult[]>("/uploads/multiple", formData, {
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
    const response = await api.get<FileInfo>(`/uploads/info/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo short code
   * @param shortCode Mã ngắn của file
   */
  deleteByShortCode: async (shortCode: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/uploads/short/${shortCode}`);
    return response.data;
  },

  /**
   * Xóa file theo object name
   * @param objectName Tên object trên MinIO
   */
  deleteFile: async (objectName: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/uploads/${encodeURIComponent(objectName)}`);
    return response.data;
  },

  /**
   * Lấy URL truy cập có thời hạn
   * @param objectName Tên object trên MinIO
   * @param expiry Thời gian hết hạn (giây), mặc định 3600 (1 giờ)
   */
  getPresignedUrl: async (objectName: string, expiry?: number): Promise<PresignedUrlResponse> => {
    const params = expiry ? { expiry } : {};
    const response = await api.get<PresignedUrlResponse>(`/uploads/presigned/${encodeURIComponent(objectName)}`, { params });
    return response.data;
  },

  /**
   * Helper: Tạo URL đầy đủ từ short code
   * @param shortCode Mã ngắn của file
   */
  getShortUrl: (shortCode: string): string => {
    return `/api/uploads/s/${shortCode}`;
  },

  /**
   * Helper: Kiểm tra file có phải là hình ảnh không
   * @param file File cần kiểm tra
   */
  isImage: (file: File): boolean => {
    return file.type.startsWith("image/");
  },

  /**
   * Helper: Kiểm tra file có phải là video không
   * @param file File cần kiểm tra
   */
  isVideo: (file: File): boolean => {
    return file.type.startsWith("video/");
  },

  /**
   * Helper: Kiểm tra kích thước file (MB)
   * @param file File cần kiểm tra
   * @param maxSizeMB Kích thước tối đa (MB)
   */
  checkFileSize: (file: File, maxSizeMB: number): boolean => {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  /**
   * Helper: Format kích thước file
   * @param bytes Kích thước (bytes)
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};
