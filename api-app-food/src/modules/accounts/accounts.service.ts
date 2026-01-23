import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FoodPlatformAccount,
  AccountStatus,
  FoodPlatformType,
} from '../../database/entities';
import { EncryptionService } from '../../common/services/encryption.service';
import { ConnectorFactory } from '../connectors/connector.factory';
import {
  CreateAccountDto,
  LoginDto,
  RequestOtpDto,
  VerifyOtpDto,
  SelectStoreDto,
  UpdateAccountSettingsDto,
} from './dto/login.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
    private readonly encryptionService: EncryptionService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  /**
   * Create a new account (pending state)
   */
  async createAccount(dto: CreateAccountDto): Promise<FoodPlatformAccount> {
    const account = this.accountRepo.create({
      tenantId: dto.tenantId,
      platform: dto.platform,
      authType: dto.authType,
      displayName: dto.displayName,
      status: AccountStatus.PENDING,
      isActive: false,
    });

    return this.accountRepo.save(account);
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string): Promise<FoodPlatformAccount> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Không tìm thấy tài khoản với ID: ${id}`);
    }
    return account;
  }

  /**
   * Get accounts by tenant
   */
  async getAccountsByTenant(tenantId: string): Promise<FoodPlatformAccount[]> {
    return this.accountRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Login with username/password
   */
  async login(accountId: string, dto: LoginDto): Promise<FoodPlatformAccount> {
    const account = await this.getAccountById(accountId);

    // Update status to connecting
    account.status = AccountStatus.CONNECTING;
    account.username = dto.username;
    account.password = this.encryptionService.encrypt(dto.password);
    await this.accountRepo.save(account);

    // Get connector and login
    const connector = this.connectorFactory.getConnector(account.platform);
    const result = await connector.login({
      username: dto.username,
      password: dto.password,
    });

    if (!result.success) {
      account.status = AccountStatus.ERROR;
      account.lastError = result.error;
      account.errorCount += 1;
      await this.accountRepo.save(account);

      throw new BadRequestException(result.error || 'Đăng nhập thất bại');
    }

    // Update account with tokens
    account.accessToken = result.accessToken;
    account.refreshToken = result.refreshToken;
    account.tokenExpiresAt = result.expiresIn
      ? new Date(Date.now() + result.expiresIn * 1000)
      : null;
    account.externalMerchantId = result.merchantId;
    account.externalMerchantName = result.merchantName;
    account.status = AccountStatus.CONNECTED;
    account.isActive = true;
    account.errorCount = 0;
    account.lastError = null;

    return this.accountRepo.save(account);
  }

  /**
   * Request OTP for phone authentication
   */
  async requestOtp(
    accountId: string,
    dto: RequestOtpDto,
  ): Promise<{ success: boolean; message: string; expiresIn: number }> {
    const account = await this.getAccountById(accountId);

    // Update status and phone
    account.status = AccountStatus.CONNECTING;
    account.phoneNumber = dto.phoneNumber;
    await this.accountRepo.save(account);

    // Get connector and request OTP
    const connector = this.connectorFactory.getConnector(account.platform);
    const result = await connector.requestOtp(dto.phoneNumber);

    if (!result.success) {
      throw new BadRequestException(result.error || 'Gửi OTP thất bại');
    }

    // Save OTP session
    account.otpSessionId = result.sessionId;
    account.otpExpiresAt = new Date(Date.now() + (result.expiresIn || 300) * 1000);
    await this.accountRepo.save(account);

    return {
      success: true,
      message: `Mã OTP đã được gửi đến số ${dto.phoneNumber}`,
      expiresIn: result.expiresIn || 300,
    };
  }

  /**
   * Verify OTP
   */
  async verifyOtp(
    accountId: string,
    dto: VerifyOtpDto,
  ): Promise<{ success: boolean; stores?: any[] }> {
    const account = await this.getAccountById(accountId);

    // Check OTP expiration
    if (!account.otpSessionId || !account.otpExpiresAt) {
      throw new BadRequestException('Chưa yêu cầu OTP hoặc OTP đã hết hạn');
    }

    if (new Date() > account.otpExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Get connector and verify OTP
    const connector = this.connectorFactory.getConnector(account.platform);
    const result = await connector.verifyOtp(account.otpSessionId, dto.otp);

    if (!result.success) {
      account.errorCount += 1;
      account.lastError = result.error;
      await this.accountRepo.save(account);

      throw new BadRequestException(result.error || 'Mã OTP không chính xác');
    }

    // Update tokens
    account.accessToken = result.accessToken;
    account.refreshToken = result.refreshToken;
    account.tokenExpiresAt = result.expiresIn
      ? new Date(Date.now() + result.expiresIn * 1000)
      : null;
    account.otpSessionId = null;
    account.otpExpiresAt = null;
    await this.accountRepo.save(account);

    // Get stores list
    const stores = await connector.getStores(account);

    return {
      success: true,
      stores: stores.map((store) => ({
        merchantId: store.externalStoreId,
        storeName: store.name,
        address: store.address,
        isActive: store.isActive,
      })),
    };
  }

  /**
   * Select store (for OTP flow after getting stores list)
   */
  async selectStore(
    accountId: string,
    dto: SelectStoreDto,
  ): Promise<FoodPlatformAccount> {
    const account = await this.getAccountById(accountId);

    if (!account.accessToken) {
      throw new BadRequestException('Chưa xác thực. Vui lòng đăng nhập lại.');
    }

    account.externalMerchantId = dto.merchantId;
    account.externalMerchantName = dto.storeName;
    account.status = AccountStatus.CONNECTED;
    account.isActive = true;
    account.errorCount = 0;
    account.lastError = null;

    return this.accountRepo.save(account);
  }

  /**
   * Disconnect account
   */
  async disconnect(accountId: string): Promise<FoodPlatformAccount> {
    const account = await this.getAccountById(accountId);

    account.status = AccountStatus.DISCONNECTED;
    account.isActive = false;
    account.accessToken = null;
    account.refreshToken = null;
    account.tokenExpiresAt = null;

    return this.accountRepo.save(account);
  }

  /**
   * Update account settings
   */
  async updateSettings(
    accountId: string,
    dto: UpdateAccountSettingsDto,
  ): Promise<FoodPlatformAccount> {
    const account = await this.getAccountById(accountId);

    if (dto.autoConfirmEnabled !== undefined) {
      account.autoConfirmEnabled = dto.autoConfirmEnabled;
    }
    if (dto.autoPrintEnabled !== undefined) {
      account.autoPrintEnabled = dto.autoPrintEnabled;
    }
    if (dto.pollIntervalSeconds !== undefined) {
      account.pollIntervalSeconds = dto.pollIntervalSeconds;
    }

    return this.accountRepo.save(account);
  }

  /**
   * Refresh token if needed
   */
  async refreshTokenIfNeeded(account: FoodPlatformAccount): Promise<boolean> {
    if (!account.tokenExpiresAt || !account.refreshToken) {
      return false;
    }

    const expiresIn = account.tokenExpiresAt.getTime() - Date.now();

    // Refresh if token expires in less than 5 minutes
    if (expiresIn < 5 * 60 * 1000) {
      this.logger.log(`Refreshing token for account ${account.id}`);

      const connector = this.connectorFactory.getConnector(account.platform);
      const result = await connector.refreshToken(account.refreshToken);

      if (result.success) {
        account.accessToken = result.accessToken;
        account.refreshToken = result.refreshToken || account.refreshToken;
        account.tokenExpiresAt = result.expiresIn
          ? new Date(Date.now() + result.expiresIn * 1000)
          : null;
        account.errorCount = 0;
        await this.accountRepo.save(account);
        return true;
      } else {
        account.status = AccountStatus.DISCONNECTED;
        account.isActive = false;
        account.lastError = result.error;
        account.errorCount += 1;
        await this.accountRepo.save(account);
        return false;
      }
    }

    return true;
  }

  /**
   * Get stores from platform
   */
  async getStores(accountId: string): Promise<any[]> {
    const account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.CONNECTED) {
      throw new BadRequestException('Tài khoản chưa kết nối');
    }

    await this.refreshTokenIfNeeded(account);

    const connector = this.connectorFactory.getConnector(account.platform);
    const stores = await connector.getStores(account);

    return stores.map((store) => ({
      externalStoreId: store.externalStoreId,
      name: store.name,
      address: store.address,
      phone: store.phone,
      isActive: store.isActive,
    }));
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    await this.accountRepo.remove(account);
  }
}
