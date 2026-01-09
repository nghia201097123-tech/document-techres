import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffBranchService } from './staff-branch.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AssignBranchDto,
  BulkAssignBranchesDto,
  BulkAssignToMultipleStaffDto,
} from './dto';

@ApiTags('Staff Branch')
@Controller('staff')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StaffBranchController {
  constructor(private readonly staffBranchService: StaffBranchService) {}

  // Bulk assign to multiple staff - must be before :staffId routes
  @Post('bulk-branch-assign')
  @ApiOperation({ summary: 'Gán chi nhánh cho nhiều nhân viên cùng lúc' })
  bulkAssignToMultipleStaff(
    @Request() req,
    @Body() dto: BulkAssignToMultipleStaffDto,
  ) {
    return this.staffBranchService.bulkAssignToMultipleStaff(
      req.user.tenantId,
      dto.staffIds,
      dto.branchIds,
      dto.defaultBranchId,
    );
  }

  @Get(':staffId/branches')
  @ApiOperation({ summary: 'Lấy danh sách chi nhánh của nhân viên' })
  getByStaffId(@Request() req, @Param('staffId') staffId: string) {
    return this.staffBranchService.getByStaffId(req.user.tenantId, staffId);
  }

  @Post(':staffId/branches')
  @ApiOperation({ summary: 'Gán chi nhánh cho nhân viên' })
  assignBranch(
    @Request() req,
    @Param('staffId') staffId: string,
    @Body() dto: AssignBranchDto,
  ) {
    return this.staffBranchService.assignBranch(
      req.user.tenantId,
      staffId,
      dto.branchId,
      dto.isDefault,
    );
  }

  @Put(':staffId/branches')
  @ApiOperation({ summary: 'Cập nhật toàn bộ chi nhánh của nhân viên' })
  bulkAssign(
    @Request() req,
    @Param('staffId') staffId: string,
    @Body() dto: BulkAssignBranchesDto,
  ) {
    return this.staffBranchService.bulkAssign(
      req.user.tenantId,
      staffId,
      dto.branchIds,
      dto.defaultBranchId,
    );
  }

  @Delete(':staffId/branches/:branchId')
  @ApiOperation({ summary: 'Xóa quyền chi nhánh của nhân viên' })
  removeBranch(
    @Request() req,
    @Param('staffId') staffId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.staffBranchService.removeBranch(req.user.tenantId, staffId, branchId);
  }

  @Patch(':staffId/branches/:branchId/set-default')
  @ApiOperation({ summary: 'Đặt chi nhánh mặc định cho nhân viên' })
  setDefaultBranch(
    @Request() req,
    @Param('staffId') staffId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.staffBranchService.setDefaultBranch(req.user.tenantId, staffId, branchId);
  }
}
