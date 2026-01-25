import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  FoodPlatformAccount,
  FoodPlatformStoreMapping,
  AccountStatus,
  FoodPlatformType,
} from '../../database/entities';
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
    @InjectRepository(FoodPlatformStoreMapping)
    private readonly storeMappingRepo: Repository<FoodPlatformStoreMapping>,
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
   * Get accounts by branch
   * Returns accounts that match the branchId OR have no branch assigned (null)
   * This allows unassigned accounts to be shown and linked to a branch
   */
  async getAccountsByBranch(branchId: string): Promise<FoodPlatformAccount[]> {
    return this.accountRepo.find({
      where: [
        { branchId },
        { branchId: IsNull() },
      ],
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
    account.password = dto.password;
    await this.accountRepo.save(account);

    // Get connector and login
    const connector = this.connectorFactory.getConnector(account.platform);
    const result = await connector.login({
      username: dto.username,
      password: dto.password,
    });

    if (!result.success) {
      account.status = AccountStatus.ERROR;
      account.lastError = result.error ?? null;
      account.errorCount += 1;
      await this.accountRepo.save(account);

      throw new BadRequestException(result.error || 'Đăng nhập thất bại');
    }

    // Update account with tokens
    account.accessToken = result.accessToken ?? null;
    account.refreshToken = result.refreshToken ?? null;
    account.tokenExpiresAt = result.expiresIn
      ? new Date(Date.now() + result.expiresIn * 1000)
      : null;
    account.externalMerchantId = result.merchantId ?? null;
    account.externalMerchantName = result.merchantName ?? null;
    account.status = AccountStatus.CONNECTED;
    account.isActive = true;
    account.errorCount = 0;
    account.lastError = null;

    // Set branchId if provided (when linking from a branch context)
    if (dto.branchId) {
      account.branchId = dto.branchId;
    }

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
    account.otpSessionId = result.sessionId ?? null;
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
      account.lastError = result.error ?? null;
      await this.accountRepo.save(account);

      throw new BadRequestException(result.error || 'Mã OTP không chính xác');
    }

    // Update tokens
    account.accessToken = result.accessToken ?? null;
    account.refreshToken = result.refreshToken ?? null;
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
   * Reconnect account using stored credentials
   * Used when token expires and refresh fails
   */
  async reconnect(accountId: string): Promise<FoodPlatformAccount> {
    this.logger.log(`[reconnect] Starting reconnect for account ${accountId}`);
    const account = await this.getAccountById(accountId);

    this.logger.log(`[reconnect] Account found: username=${account.username}, hasPassword=${!!account.password}`);

    // Check if we have stored credentials
    if (!account.username || !account.password) {
      this.logger.error(`[reconnect] No credentials stored!`);
      throw new BadRequestException(
        'Không có thông tin đăng nhập. Vui lòng đăng nhập lại với tài khoản và mật khẩu.',
      );
    }

    // Use stored password directly (plain text)
    const password = account.password;
    this.logger.log(`[reconnect] Using credentials: ${account.username} / ${password.substring(0, 3)}***`);

    // Update status to connecting
    account.status = AccountStatus.CONNECTING;
    await this.accountRepo.save(account);

    // Get connector and login
    this.logger.log(`[reconnect] Calling connector.login...`);
    const connector = this.connectorFactory.getConnector(account.platform);
    const result = await connector.login({
      username: account.username,
      password: password,
    });

    this.logger.log(`[reconnect] Login result: success=${result.success}, hasToken=${!!result.accessToken}`);

    if (!result.success) {
      this.logger.error(`[reconnect] Login failed: ${result.error}`);
      account.status = AccountStatus.DISCONNECTED;
      account.lastError = result.error ?? 'Không thể kết nối lại. Vui lòng đăng nhập lại.';
      account.errorCount += 1;
      account.isActive = false;
      await this.accountRepo.save(account);

      throw new BadRequestException(
        result.error || 'Kết nối lại thất bại. Tài khoản có thể đã bị thay đổi mật khẩu.',
      );
    }

    // Update account with new tokens
    account.accessToken = result.accessToken ?? null;
    account.refreshToken = result.refreshToken ?? null;
    account.tokenExpiresAt = result.expiresIn
      ? new Date(Date.now() + result.expiresIn * 1000)
      : null;
    account.externalMerchantId = result.merchantId ?? account.externalMerchantId;
    account.externalMerchantName = result.merchantName ?? account.externalMerchantName;
    account.status = AccountStatus.CONNECTED;
    account.isActive = true;
    account.errorCount = 0;
    account.lastError = null;

    this.logger.log(`[reconnect] Account ${accountId} reconnected successfully! New token: ${account.accessToken?.substring(0, 20)}...`);

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
        account.accessToken = result.accessToken ?? null;
        account.refreshToken = result.refreshToken ?? account.refreshToken;
        account.tokenExpiresAt = result.expiresIn
          ? new Date(Date.now() + result.expiresIn * 1000)
          : null;
        account.errorCount = 0;
        await this.accountRepo.save(account);
        return true;
      } else {
        account.status = AccountStatus.DISCONNECTED;
        account.isActive = false;
        account.lastError = result.error ?? null;
        account.errorCount += 1;
        await this.accountRepo.save(account);
        return false;
      }
    }

    return true;
  }

  /**
   * Get stores from platform
   * Auto-reconnect if token expired (401)
   */
  async getStores(accountId: string): Promise<any[]> {
    let account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.CONNECTED) {
      throw new BadRequestException('Tài khoản chưa kết nối');
    }

    await this.refreshTokenIfNeeded(account);

    const connector = this.connectorFactory.getConnector(account.platform);

    try {
      this.logger.log(`[getStores] Fetching stores for account ${accountId}...`);
      const stores = await connector.getStores(account);
      this.logger.log(`[getStores] Got ${stores.length} stores`);
      return this.mapStores(stores);
    } catch (error: any) {
      this.logger.error(`[getStores] Error caught:`, error?.message || error);
      this.logger.error(`[getStores] Error type: ${error?.constructor?.name}`);
      this.logger.error(`[getStores] Is UnauthorizedException: ${error instanceof UnauthorizedException}`);

      // Check if it's a 401 Unauthorized error (check both instance and error name)
      const isUnauthorized = error instanceof UnauthorizedException ||
        error?.name === 'UnauthorizedException' ||
        error?.status === 401 ||
        error?.message?.includes('UNAUTHORIZED') ||
        error?.message?.includes('401');

      this.logger.log(`[getStores] isUnauthorized: ${isUnauthorized}`);

      if (isUnauthorized) {
        this.logger.log(`[getStores] Token expired for account ${accountId}, attempting to reconnect (1 retry only)...`);

        try {
          // Auto-reconnect using stored credentials
          this.logger.log(`[getStores] Calling reconnect...`);
          account = await this.reconnect(accountId);
          this.logger.log(`[getStores] Reconnect success! New token: ${account.accessToken?.substring(0, 20)}...`);

          // Retry getting stores with new token (only 1 retry)
          this.logger.log(`[getStores] Retrying getStores with new token...`);
          const stores = await connector.getStores(account);
          this.logger.log(`[getStores] Retry success! Got ${stores.length} stores`);
          return this.mapStores(stores);
        } catch (reconnectError: any) {
          this.logger.error(`[getStores] Failed to reconnect or retry: ${reconnectError?.message}`);

          // Mark account as disconnected
          account.status = AccountStatus.DISCONNECTED;
          account.isActive = false;
          account.lastError = 'Token hết hạn và không thể kết nối lại tự động.';
          account.errorCount += 1;
          await this.accountRepo.save(account);

          this.logger.log(`[getStores] Account ${accountId} marked as DISCONNECTED`);

          throw new BadRequestException(
            'Token hết hạn và không thể kết nối lại. Tài khoản đã bị đánh dấu mất kết nối. Vui lòng đăng nhập lại.',
          );
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Map stores to response format
   */
  private mapStores(stores: any[]): any[] {
    return stores.map((store) => ({
      externalStoreId: store.externalStoreId,
      externalMerchantId: store.merchantId, // Merchant ID from get_user_profiles (for BeFood)
      name: store.name,
      address: store.address,
      phone: store.phone,
      email: store.email,
      isActive: store.isActive,
    }));
  }

  /**
   * Test connection by calling platform API
   * Auto-reconnect if token expired (401)
   */
  async testConnection(accountId: string): Promise<{
    success: boolean;
    status: AccountStatus;
    message: string;
  }> {
    this.logger.log(`[testConnection] Testing connection for account ${accountId}`);
    const account = await this.getAccountById(accountId);

    // If account is not connected, try to reconnect first
    if (account.status === AccountStatus.DISCONNECTED) {
      this.logger.log(`[testConnection] Account is DISCONNECTED, attempting to reconnect...`);
      try {
        const reconnectedAccount = await this.reconnect(accountId);
        return {
          success: true,
          status: reconnectedAccount.status,
          message: 'Kết nối lại thành công',
        };
      } catch (error: any) {
        return {
          success: false,
          status: AccountStatus.DISCONNECTED,
          message: error?.message || 'Không thể kết nối lại. Vui lòng đăng nhập lại.',
        };
      }
    }

    // Try to call getStores to test the connection (this has auto-reconnect logic)
    try {
      this.logger.log(`[testConnection] Calling getStores to test connection...`);
      await this.getStores(accountId);

      // If we get here, connection is working
      const updatedAccount = await this.getAccountById(accountId);
      return {
        success: true,
        status: updatedAccount.status,
        message: 'Kết nối đang hoạt động bình thường',
      };
    } catch (error: any) {
      // getStores failed, return the error
      const failedAccount = await this.getAccountById(accountId);
      return {
        success: false,
        status: failedAccount.status,
        message: error?.message || failedAccount.lastError || 'Kết nối có vấn đề',
      };
    }
  }

  /**
   * Get menu from platform
   * Auto-reconnect if token expired (401)
   */
  async getMenu(accountId: string): Promise<any> {
    let account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.CONNECTED) {
      throw new BadRequestException('Tài khoản chưa kết nối');
    }

    await this.refreshTokenIfNeeded(account);

    const connector = this.connectorFactory.getConnector(account.platform) as any;

    // Check if connector supports getMenu
    if (typeof connector.getMenu !== 'function') {
      throw new BadRequestException(`Platform ${account.platform} không hỗ trợ lấy menu`);
    }

    // For BeFood, we need to get storeId from store mappings
    let storeId: string | undefined;
    let merchantId: string | undefined;

    if (account.platform === FoodPlatformType.BEFOOD) {
      this.logger.log(`[getMenu] ===== BEFOOD MENU FLOW =====`);
      this.logger.log(`[getMenu] Account ID: ${account.id}`);
      this.logger.log(`[getMenu] Account username: ${account.username}`);

      // Get the first store mapping to use its storeId and merchantId
      const storeMapping = await this.storeMappingRepo.findOne({
        where: { accountId: account.id, isActive: true },
      });

      this.logger.log(`[getMenu] Store mapping found: ${!!storeMapping}`);
      if (storeMapping) {
        this.logger.log(`[getMenu] Store mapping: externalStoreId=${storeMapping.externalStoreId}, externalMerchantId=${storeMapping.externalMerchantId}, branchId=${storeMapping.branchId}`);
        storeId = storeMapping.externalStoreId;
        merchantId = storeMapping.externalMerchantId || undefined;

        // Fallback: If merchantId is missing, fetch from getStores and update mapping
        if (!merchantId) {
          this.logger.log(`[getMenu] merchantId is missing, fetching from getStores...`);
          try {
            const stores = await connector.getStores(account);
            const matchingStore = stores.find((s: any) => String(s.externalStoreId) === String(storeId));
            if (matchingStore?.merchantId) {
              merchantId = matchingStore.merchantId;
              this.logger.log(`[getMenu] Found merchantId from getStores: ${merchantId}`);

              // Update the store mapping with merchantId for future calls
              storeMapping.externalMerchantId = merchantId;
              await this.storeMappingRepo.save(storeMapping);
              this.logger.log(`[getMenu] Updated store mapping with merchantId`);
            }
          } catch (err: any) {
            this.logger.warn(`[getMenu] Failed to fetch merchantId from getStores: ${err?.message}`);
          }
        }

        this.logger.log(`[getMenu] Using storeId: ${storeId}, merchantId: ${merchantId}`);
      } else {
        this.logger.warn(`[getMenu] No store mapping found for BeFood account ${accountId}`);
      }
    }

    try {
      this.logger.log(`[getMenu] Fetching menu for account ${accountId}...`);
      const menu = await connector.getMenu(account, storeId, merchantId);
      this.logger.log(`[getMenu] Got ${menu?.categories?.length || 0} categories`);
      return menu;
    } catch (error: any) {
      this.logger.error(`[getMenu] Error caught: ${error?.message}`);

      // Check if it's a 401 Unauthorized error
      const isUnauthorized = error instanceof UnauthorizedException ||
        error?.name === 'UnauthorizedException' ||
        error?.status === 401 ||
        error?.message?.includes('UNAUTHORIZED') ||
        error?.message?.includes('401');

      if (isUnauthorized) {
        this.logger.log(`[getMenu] Token expired, attempting to reconnect...`);

        try {
          account = await this.reconnect(accountId);
          this.logger.log(`[getMenu] Reconnect success, retrying getMenu...`);

          const menu = await connector.getMenu(account, storeId, merchantId);
          this.logger.log(`[getMenu] Retry success! Got ${menu?.categories?.length || 0} categories`);
          return menu;
        } catch (reconnectError: any) {
          this.logger.error(`[getMenu] Failed to reconnect: ${reconnectError?.message}`);

          // Mark account as disconnected
          account.status = AccountStatus.DISCONNECTED;
          account.isActive = false;
          account.lastError = 'Token hết hạn và không thể kết nối lại tự động.';
          account.errorCount += 1;
          await this.accountRepo.save(account);

          throw new BadRequestException(
            'Token hết hạn và không thể kết nối lại. Vui lòng đăng nhập lại.',
          );
        }
      }

      throw error;
    }
  }

  /**
   * Update account branch assignment
   */
  async updateBranch(
    accountId: string,
    branchId: string,
  ): Promise<FoodPlatformAccount> {
    const account = await this.getAccountById(accountId);
    account.branchId = branchId;
    return this.accountRepo.save(account);
  }

  /**
   * Delete account
   */
  async deleteAccount(accountId: string): Promise<void> {
    const account = await this.getAccountById(accountId);
    await this.accountRepo.remove(account);
  }
}
