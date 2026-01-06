import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateEInvoiceConfigDto,
  UpdateEInvoiceConfigDto,
} from './dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ==================== PAYMENT METHODS ====================

  @Get('payment-methods')
  async findAllPaymentMethods(@Request() req: any, @Query('brandId') brandId: string) {
    return this.settingsService.findAllPaymentMethods(req.user.tenantId, brandId);
  }

  @Get('payment-methods/:id')
  async findOnePaymentMethod(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.findOnePaymentMethod(req.user.tenantId, id);
  }

  @Post('payment-methods')
  async createPaymentMethod(
    @Request() req: any,
    @Query('brandId') brandId: string,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.settingsService.createPaymentMethod(req.user.tenantId, brandId, dto);
  }

  @Put('payment-methods/:id')
  async updatePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.settingsService.updatePaymentMethod(req.user.tenantId, id, dto);
  }

  @Patch('payment-methods/:id/toggle')
  async togglePaymentMethodActive(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.togglePaymentMethodActive(req.user.tenantId, id);
  }

  @Delete('payment-methods/:id')
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.deletePaymentMethod(req.user.tenantId, id);
  }

  // ==================== BANK ACCOUNTS ====================

  @Get('bank-accounts')
  async findAllBankAccounts(@Request() req: any, @Query('brandId') brandId: string) {
    return this.settingsService.findAllBankAccounts(req.user.tenantId, brandId);
  }

  @Get('bank-accounts/:id')
  async findOneBankAccount(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.findOneBankAccount(req.user.tenantId, id);
  }

  @Post('bank-accounts')
  async createBankAccount(
    @Request() req: any,
    @Query('brandId') brandId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.settingsService.createBankAccount(req.user.tenantId, brandId, dto);
  }

  @Put('bank-accounts/:id')
  async updateBankAccount(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.settingsService.updateBankAccount(req.user.tenantId, id, dto);
  }

  @Patch('bank-accounts/:id/toggle')
  async toggleBankAccountActive(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.toggleBankAccountActive(req.user.tenantId, id);
  }

  @Delete('bank-accounts/:id')
  async deleteBankAccount(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.deleteBankAccount(req.user.tenantId, id);
  }

  @Get('bank-accounts/:id/qr')
  async generateVietQR(
    @Request() req: any,
    @Param('id') id: string,
    @Query('amount') amount?: number,
    @Query('description') description?: string,
  ) {
    return this.settingsService.generateVietQR(req.user.tenantId, id, amount, description);
  }

  // ==================== E-INVOICE CONFIG ====================

  @Get('einvoice-configs')
  async findAllEInvoiceConfigs(@Request() req: any, @Query('brandId') brandId: string) {
    return this.settingsService.findAllEInvoiceConfigs(req.user.tenantId, brandId);
  }

  @Get('einvoice-configs/:id')
  async findOneEInvoiceConfig(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.findOneEInvoiceConfig(req.user.tenantId, id);
  }

  @Post('einvoice-configs')
  async createEInvoiceConfig(
    @Request() req: any,
    @Query('brandId') brandId: string,
    @Body() dto: CreateEInvoiceConfigDto,
  ) {
    return this.settingsService.createEInvoiceConfig(req.user.tenantId, brandId, dto);
  }

  @Put('einvoice-configs/:id')
  async updateEInvoiceConfig(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEInvoiceConfigDto,
  ) {
    return this.settingsService.updateEInvoiceConfig(req.user.tenantId, id, dto);
  }

  @Patch('einvoice-configs/:id/toggle')
  async toggleEInvoiceConfigActive(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.toggleEInvoiceConfigActive(req.user.tenantId, id);
  }

  @Delete('einvoice-configs/:id')
  async deleteEInvoiceConfig(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.deleteEInvoiceConfig(req.user.tenantId, id);
  }
}
