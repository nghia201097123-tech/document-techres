import api from "./api";

export interface Province {
  code: string;
  name: string;
  fullName: string;
}

export interface District {
  code: string;
  name: string;
  fullName: string;
  provinceCode: string;
}

export interface Ward {
  code: string;
  name: string;
  fullName: string;
  districtCode: string;
}

export const locationService = {
  async getProvinces(): Promise<Province[]> {
    const response = await api.get<Province[]>("/locations/provinces");
    return response.data;
  },

  async getDistricts(provinceCode: string): Promise<District[]> {
    const response = await api.get<District[]>(
      `/locations/provinces/${provinceCode}/districts`
    );
    return response.data;
  },

  async getWards(districtCode: string): Promise<Ward[]> {
    const response = await api.get<Ward[]>(
      `/locations/districts/${districtCode}/wards`
    );
    return response.data;
  },
};
