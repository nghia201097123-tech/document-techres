import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from '../../database/entities/payment-method.entity';
import { BankAccount } from '../../database/entities/bank-account.entity';
import { EInvoiceConfig } from '../../database/entities/einvoice-config.entity';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateEInvoiceConfigDto,
  UpdateEInvoiceConfigDto,
} from './dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(EInvoiceConfig)
    private readonly eInvoiceConfigRepository: Repository<EInvoiceConfig>,
  ) {}

  // ==================== PAYMENT METHODS ====================

  async findAllPaymentMethods(tenantId: string, brandId: string) {
    return this.paymentMethodRepository.find({
      where: { tenantId, brandId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOnePaymentMethod(tenantId: string, id: string) {
    const method = await this.paymentMethodRepository.findOne({
      where: { tenantId, id },
    });
    if (!method) {
      throw new NotFoundException('Không tìm thấy phương thức thanh toán');
    }
    return method;
  }

  async createPaymentMethod(tenantId: string, brandId: string, dto: CreatePaymentMethodDto) {
    const method = this.paymentMethodRepository.create({
      ...dto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.paymentMethodRepository.save(method);
  }

  async updatePaymentMethod(tenantId: string, id: string, dto: UpdatePaymentMethodDto) {
    const method = await this.findOnePaymentMethod(tenantId, id);
    Object.assign(method, dto);
    return this.paymentMethodRepository.save(method);
  }

  async togglePaymentMethodActive(tenantId: string, id: string) {
    const method = await this.findOnePaymentMethod(tenantId, id);
    method.isActive = !method.isActive;
    return this.paymentMethodRepository.save(method);
  }

  async deletePaymentMethod(tenantId: string, id: string) {
    const method = await this.findOnePaymentMethod(tenantId, id);
    await this.paymentMethodRepository.remove(method);
    return { message: 'Đã xóa phương thức thanh toán' };
  }

  // ==================== BANK ACCOUNTS ====================

  async findAllBankAccounts(tenantId: string, brandId: string) {
    return this.bankAccountRepository.find({
      where: { tenantId, brandId },
      relations: ['branch'],
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOneBankAccount(tenantId: string, id: string) {
    const account = await this.bankAccountRepository.findOne({
      where: { tenantId, id },
      relations: ['branch'],
    });
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản ngân hàng');
    }
    return account;
  }

  async createBankAccount(tenantId: string, brandId: string, dto: CreateBankAccountDto) {
    // If this is set as primary, unset other primary accounts
    if (dto.isPrimary) {
      await this.bankAccountRepository.update(
        { tenantId, brandId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const account = this.bankAccountRepository.create({
      ...dto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.bankAccountRepository.save(account);
  }

  async updateBankAccount(tenantId: string, id: string, dto: UpdateBankAccountDto) {
    const account = await this.findOneBankAccount(tenantId, id);

    // If setting as primary, unset other primary accounts
    if (dto.isPrimary && !account.isPrimary) {
      await this.bankAccountRepository.update(
        { tenantId, brandId: account.brandId, isPrimary: true },
        { isPrimary: false }
      );
    }

    Object.assign(account, dto);
    return this.bankAccountRepository.save(account);
  }

  async toggleBankAccountActive(tenantId: string, id: string) {
    const account = await this.findOneBankAccount(tenantId, id);
    account.isActive = !account.isActive;
    return this.bankAccountRepository.save(account);
  }

  async deleteBankAccount(tenantId: string, id: string) {
    const account = await this.findOneBankAccount(tenantId, id);
    await this.bankAccountRepository.remove(account);
    return { message: 'Đã xóa tài khoản ngân hàng' };
  }

  async generateVietQR(tenantId: string, id: string, amount?: number, description?: string) {
    const account = await this.findOneBankAccount(tenantId, id);

    // Generate VietQR URL
    // Format: https://img.vietqr.io/image/{bankBin}-{accountNumber}-compact.png?amount={amount}&addInfo={description}
    const baseUrl = 'https://img.vietqr.io/image';
    const bankBin = account.bankBin || account.bankCode;
    let qrUrl = `${baseUrl}/${bankBin}-${account.accountNumber}-compact.png`;

    const params = new URLSearchParams();
    if (amount) params.append('amount', amount.toString());
    if (description) params.append('addInfo', description);
    params.append('accountName', account.accountName);

    if (params.toString()) {
      qrUrl += `?${params.toString()}`;
    }

    return {
      qrUrl,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      amount,
      description,
    };
  }

  // ==================== E-INVOICE CONFIG ====================

  async findAllEInvoiceConfigs(tenantId: string, brandId: string) {
    return this.eInvoiceConfigRepository.find({
      where: { tenantId, brandId },
      relations: ['branch'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneEInvoiceConfig(tenantId: string, id: string) {
    const config = await this.eInvoiceConfigRepository.findOne({
      where: { tenantId, id },
      relations: ['branch'],
    });
    if (!config) {
      throw new NotFoundException('Không tìm thấy cấu hình hóa đơn điện tử');
    }
    return config;
  }

  async createEInvoiceConfig(tenantId: string, brandId: string, dto: CreateEInvoiceConfigDto) {
    const config = this.eInvoiceConfigRepository.create({
      ...dto,
      tenantId,
      brandId,
      isActive: true,
    });
    return this.eInvoiceConfigRepository.save(config);
  }

  async updateEInvoiceConfig(tenantId: string, id: string, dto: UpdateEInvoiceConfigDto) {
    const config = await this.findOneEInvoiceConfig(tenantId, id);
    Object.assign(config, dto);
    return this.eInvoiceConfigRepository.save(config);
  }

  async toggleEInvoiceConfigActive(tenantId: string, id: string) {
    const config = await this.findOneEInvoiceConfig(tenantId, id);
    config.isActive = !config.isActive;
    return this.eInvoiceConfigRepository.save(config);
  }

  async deleteEInvoiceConfig(tenantId: string, id: string) {
    const config = await this.findOneEInvoiceConfig(tenantId, id);
    await this.eInvoiceConfigRepository.remove(config);
    return { message: 'Đã xóa cấu hình hóa đơn điện tử' };
  }
}
