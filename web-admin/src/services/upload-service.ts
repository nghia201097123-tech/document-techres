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
   * Kiểm tra file có phải là hình ảnh không
   * @param file File cần kiểm tra
   */
  isImage: (file: File): boolean => {
    return file.type.startsWith("image/");
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
};
