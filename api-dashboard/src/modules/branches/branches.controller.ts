import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách chi nhánh trong tenant' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Lọc theo thương hiệu' })
  findAll(@Request() req, @Query('brandId') brandId?: string) {
    return this.branchesService.findAll(req.user.tenantId, brandId);
  }
}
