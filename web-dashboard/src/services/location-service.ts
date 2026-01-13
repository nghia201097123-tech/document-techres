import api from "./api";

export interface Province {
  code: string;
  name: string;
  fullName: string;
}

export interface Ward {
  code: string;
  name: string;
  fullName: string;
  provinceCode: string;
}

export const locationService = {
  async getProvinces(): Promise<Province[]> {
    const response = await api.get<Province[]>("/locations/provinces");
    return response.data;
  },

  async getWards(provinceCode: string): Promise<Ward[]> {
    const response = await api.get<Ward[]>(
      `/locations/provinces/${provinceCode}/wards`
    );
    return response.data;
  },

  async getAllWards(): Promise<Ward[]> {
    const response = await api.get<Ward[]>("/locations/wards");
    return response.data;
  },

  async getWardsGroupedByProvince(): Promise<Record<string, Ward[]>> {
    const allWards = await this.getAllWards();
    // Group wards by provinceCode
    const grouped: Record<string, Ward[]> = {};
    for (const ward of allWards) {
      const key = ward.provinceCode;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(ward);
    }
    return grouped;
  },
};
