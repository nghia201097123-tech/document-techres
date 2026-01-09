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

// Mock data for demonstration
const mockStaffBranches: StaffBranch[] = [];

export const staffBranchService = {
  // Get all branches assigned to a staff member
  getByStaffId: async (staffId: string): Promise<StaffBranch[]> => {
    try {
      const response = await api.get<StaffBranch[]>(`/staff/${staffId}/branches`);
      return response.data;
    } catch (error) {
      // Return mock data if API not available
      return mockStaffBranches.filter(sb => sb.staffId === staffId);
    }
  },

  // Assign a branch to a staff member
  assignBranch: async (data: AssignBranchDto): Promise<StaffBranch> => {
    try {
      const response = await api.post<StaffBranch>(`/staff/${data.staffId}/branches`, {
        branchId: data.branchId,
        isDefault: data.isDefault || false
      });
      return response.data;
    } catch (error) {
      // Mock response
      const newAssignment: StaffBranch = {
        id: `sb_${Date.now()}`,
        staffId: data.staffId,
        branchId: data.branchId,
        branchName: "Chi nhánh mới",
        brandId: "",
        brandName: "",
        isDefault: data.isDefault || false,
        assignedAt: new Date().toISOString()
      };
      mockStaffBranches.push(newAssignment);
      return newAssignment;
    }
  },

  // Remove a branch assignment from a staff member
  removeBranch: async (staffId: string, branchId: string): Promise<void> => {
    try {
      await api.delete(`/staff/${staffId}/branches/${branchId}`);
    } catch (error) {
      // Mock: remove from local array
      const index = mockStaffBranches.findIndex(
        sb => sb.staffId === staffId && sb.branchId === branchId
      );
      if (index > -1) {
        mockStaffBranches.splice(index, 1);
      }
    }
  },

  // Set a branch as default for a staff member
  setDefaultBranch: async (staffId: string, branchId: string): Promise<void> => {
    try {
      await api.patch(`/staff/${staffId}/branches/${branchId}/set-default`);
    } catch (error) {
      // Mock: update local array
      mockStaffBranches.forEach(sb => {
        if (sb.staffId === staffId) {
          sb.isDefault = sb.branchId === branchId;
        }
      });
    }
  },

  // Bulk assign branches to a staff member (replace all assignments)
  bulkAssign: async (staffId: string, branchIds: string[], defaultBranchId?: string): Promise<StaffBranch[]> => {
    try {
      const response = await api.put<StaffBranch[]>(`/staff/${staffId}/branches`, {
        branchIds,
        defaultBranchId
      });
      return response.data;
    } catch (error) {
      // Mock response
      // Remove old assignments
      const oldIndexes = mockStaffBranches
        .map((sb, i) => sb.staffId === staffId ? i : -1)
        .filter(i => i > -1)
        .reverse();
      oldIndexes.forEach(i => mockStaffBranches.splice(i, 1));

      // Add new assignments
      const newAssignments: StaffBranch[] = branchIds.map(branchId => ({
        id: `sb_${Date.now()}_${branchId}`,
        staffId,
        branchId,
        branchName: "Chi nhánh",
        brandId: "",
        brandName: "",
        isDefault: branchId === defaultBranchId,
        assignedAt: new Date().toISOString()
      }));
      mockStaffBranches.push(...newAssignments);
      return newAssignments;
    }
  },

  // Get staff members assigned to a specific branch
  getStaffByBranchId: async (branchId: string): Promise<StaffBranchAssignment[]> => {
    try {
      const response = await api.get<StaffBranchAssignment[]>(`/branches/${branchId}/staff`);
      return response.data;
    } catch (error) {
      return [];
    }
  }
};
