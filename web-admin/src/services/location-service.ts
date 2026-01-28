import api from "./api";

/**
 * Dữ liệu địa chỉ hành chính Việt Nam sau sáp nhập 07/2025
 * Theo QĐ 19/2025/QĐ-TTg: 34 tỉnh/thành phố → xã/phường
 * (Không còn cấp quận/huyện)
 */

export interface Province {
  code: string;
  name: string;
  fullName: string;
  divisionType?: string; // "thành phố trung ương" | "tỉnh"
  phoneCode?: number;
}

export interface Ward {
  code: string;
  name: string;
  fullName: string;
  provinceCode: string; // Liên kết trực tiếp với tỉnh
  divisionType?: string; // "phường" | "xã" | "thị trấn"
}

export const locationService = {
  /**
   * Lấy danh sách 34 tỉnh/thành phố (sau sáp nhập 07/2025)
   */
  async getProvinces(): Promise<Province[]> {
    const response = await api.get<Province[]>("/api/locations/provinces");
    return response.data;
  },

  /**
   * Lấy danh sách xã/phường theo tỉnh
   * Sau sáp nhập 07/2025, xã/phường thuộc trực tiếp tỉnh/thành phố
   */
  async getWards(provinceCode: string): Promise<Ward[]> {
    const response = await api.get<Ward[]>(
      `/api/locations/provinces/${provinceCode}/wards`
    );
    return response.data;
  },

  /**
   * Seed dữ liệu địa chỉ từ API (admin only)
   */
  async seedLocations(): Promise<{ provinces: number; wards: number }> {
    const response = await api.post<{ provinces: number; wards: number }>(
      "/api/locations/seed"
    );
    return response.data;
  },
};
