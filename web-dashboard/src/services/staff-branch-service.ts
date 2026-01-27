import api from "./api";

export interface StaffBranch {
  id: string;
  staffId: string;
  branchId: string;
  branchName: string;
  brandId: string;
  brandName: string;
  isDefault: boolean;
  assignedAt: string;
}

export interface AssignBranchDto {
  staffId: string;
  branchId: string;
  isDefault?: boolean;
}

export interface StaffBranchAssignment {
  staffId: string;
  staffName: string;
  branches: {
    branchId: string;
    branchName: string;
    brandId: string;
    brandName: string;
    isDefault: boolean;
  }[];
}

export const staffBranchService = {
  // Get all branches assigned to a staff member
  getByStaffId: async (staffId: string): Promise<StaffBranch[]> => {
    const response = await api.get<StaffBranch[]>(`/api/staff/${staffId}/api/branches`);
    return response.data;
  },

  // Assign a branch to a staff member
  assignBranch: async (data: AssignBranchDto): Promise<StaffBranch> => {
    const response = await api.post<StaffBranch>(`/api/staff/${data.staffId}/api/branches`, {
      branchId: data.branchId,
      isDefault: data.isDefault || false
    });
    return response.data;
  },

  // Remove a branch assignment from a staff member
  removeBranch: async (staffId: string, branchId: string): Promise<void> => {
    await api.delete(`/api/staff/${staffId}/api/branches/${branchId}`);
  },

  // Set a branch as default for a staff member
  setDefaultBranch: async (staffId: string, branchId: string): Promise<void> => {
    await api.patch(`/api/staff/${staffId}/api/branches/${branchId}/set-default`);
  },

  // Bulk assign branches to a staff member (replace all assignments)
  bulkAssign: async (staffId: string, branchIds: string[], defaultBranchId?: string): Promise<StaffBranch[]> => {
    const response = await api.put<StaffBranch[]>(`/api/staff/${staffId}/api/branches`, {
      branchIds,
      defaultBranchId
    });
    return response.data;
  },

  // Get staff members assigned to a specific branch
  getStaffByBranchId: async (branchId: string): Promise<StaffBranchAssignment[]> => {
    const response = await api.get<StaffBranchAssignment[]>(`/api/branches/${branchId}/api/staff`);
    return response.data;
  },

  // Bulk assign branches to multiple staff members
  bulkAssignToMultipleStaff: async (
    staffIds: string[],
    branchIds: string[],
    defaultBranchId?: string
  ): Promise<{ success: number; failed: number; results: Array<{ staffId: string; success: boolean; error?: string }> }> => {
    const response = await api.post<{
      success: number;
      failed: number;
      results: Array<{ staffId: string; success: boolean; error?: string }>;
    }>(`/api/staff/bulk-branch-assign`, {
      staffIds,
      branchIds,
      defaultBranchId
    });
    return response.data;
  }
};
