import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FoodPlatformAccount,
  FoodPlatformType,
  FoodPlatformAuthType,
  FoodPlatformStatus,
} from '../../database/entities';
import {
  CreateFoodPlatformDto,
  UpdateFoodPlatformDto,
  LoginUsernamePasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
  SelectStoreDto,
} from './dto';

@Injectable()
export class FoodPlatformsService {
  constructor(
    @InjectRepository(FoodPlatformAccount)
    private readonly accountRepo: Repository<FoodPlatformAccount>,
  ) {}

  /**
   * Lấy danh sách tài khoản theo branch
   */
  async findByBranch(tenantId: string, branchId: string) {
    return this.accountRepo.find({
      where: { tenantId, branchId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Lấy tất cả tài khoản trong tenant (cho admin)
   */
  async findAll(tenantId: string, brandId?: string) {
    const query = this.accountRepo
      .createQueryBuilder('fpa')
      .leftJoinAndSelect('fpa.branch', 'branch')
      .where('fpa.tenantId = :tenantId', { tenantId });

    if (brandId) {
      query.andWhere('branch.brandId = :brandId', { brandId });
    }

    return query.orderBy('fpa.sortOrder', 'ASC').addOrderBy('fpa.createdAt', 'DESC').getMany();
  }

  /**
   * Lấy chi tiết tài khoản
   */
  async findOne(tenantId: string, id: string) {
    const account = await this.accountRepo.findOne({
      where: { id, tenantId },
      relations: ['branch'],
    });

    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return account;
  }

  /**
   * Tạo cổng kết nối mới (chưa có thông tin đăng nhập)
   */
  async create(tenantId: string, dto: CreateFoodPlatformDto) {
    // Tính shopNumber tiếp theo cho platform này trong branch
    const existingCount = await this.accountRepo.count({
      where: {
        tenantId,
        branchId: dto.branchId,
        platform: dto.platform,
      },
    });
    const shopNumber = existingCount + 1;

    // Determine auth type based on platform
    const authType = this.getAuthType(dto.platform);

    const account = this.accountRepo.create({
      tenantId,
      ...dto,
      authType,
      shopNumber,
      status: FoodPlatformStatus.PENDING,
    });

    return this.accountRepo.save(account);
  }

  /**
   * Cập nhật thông tin cổng
   */
  async update(tenantId: string, id: string, dto: UpdateFoodPlatformDto) {
    const account = await this.findOne(tenantId, id);

    Object.assign(account, dto);

    return this.accountRepo.save(account);
  }

  /**
   * Xóa cổng kết nối
   */
  async remove(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);
    await this.accountRepo.remove(account);
    return { success: true };
  }

  /**
   * Toggle trạng thái active
   */
  async toggle(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);
    account.isActive = !account.isActive;
    return this.accountRepo.save(account);
  }

  // ====== Authentication Methods ======

  /**
   * Đăng nhập bằng username/password (Grab, BeFood)
   * Được gọi từ CCB
   */
  async loginWithUsernamePassword(
    tenantId: string,
    id: string,
    dto: LoginUsernamePasswordDto,
  ) {
    const account = await this.findOne(tenantId, id);

    if (account.authType !== FoodPlatformAuthType.USERNAME_PASSWORD) {
      throw new BadRequestException(
        'Tài khoản này không hỗ trợ đăng nhập bằng username/password',
      );
    }

    // Lưu thông tin đăng nhập (sẽ được encrypt)
    account.username = dto.username;
    account.password = dto.password; // TODO: Encrypt password
    account.status = FoodPlatformStatus.CONNECTING;

    await this.accountRepo.save(account);

    // TODO: Thực hiện đăng nhập thực tế với platform API
    // Đây là placeholder, sau này sẽ gọi API thực tế

    return {
      success: true,
      message: 'Đang kết nối...',
      accountId: account.id,
    };
  }

  /**
   * Yêu cầu gửi OTP (ShopeeFood)
   * Được gọi từ CCB
   */
  async requestOtp(tenantId: string, id: string, dto: RequestOtpDto) {
    const account = await this.findOne(tenantId, id);

    if (account.authType !== FoodPlatformAuthType.PHONE_OTP) {
      throw new BadRequestException('Tài khoản này không hỗ trợ đăng nhập bằng OTP');
    }

    // Lưu SĐT
    account.phoneNumber = dto.phoneNumber;
    account.status = FoodPlatformStatus.CONNECTING;

    // TODO: Gọi API ShopeeFood để gửi OTP
    // Tạm thời mock OTP session
    account.otpSessionId = `otp_${Date.now()}`;
    account.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    await this.accountRepo.save(account);

    return {
      success: true,
      message: 'OTP đã được gửi đến số điện thoại',
      expiresAt: account.otpExpiresAt,
    };
  }

  /**
   * Xác thực OTP (ShopeeFood)
   * Được gọi từ CCB
   */
  async verifyOtp(tenantId: string, id: string, dto: VerifyOtpDto) {
    const account = await this.findOne(tenantId, id);

    if (!account.otpSessionId) {
      throw new BadRequestException('Chưa yêu cầu OTP');
    }

    if (account.otpExpiresAt && account.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP đã hết hạn');
    }

    // TODO: Gọi API ShopeeFood để verify OTP
    // Sau khi verify thành công, lấy danh sách cửa hàng

    return {
      success: true,
      message: 'Xác thực thành công',
      stores: [
        // Mock data - sẽ được thay bằng data thực tế từ API
        { id: 'store_1', name: 'Cửa hàng 1', address: '123 Nguyễn Huệ, Q1' },
        { id: 'store_2', name: 'Cửa hàng 2', address: '456 Lê Lợi, Q1' },
      ],
    };
  }

  /**
   * Chọn cửa hàng sau khi xác thực OTP (ShopeeFood)
   * Được gọi từ CCB
   */
  async selectStore(tenantId: string, id: string, dto: SelectStoreDto) {
    const account = await this.findOne(tenantId, id);

    account.externalMerchantId = dto.storeId;
    account.externalStoreName = dto.storeName;
    account.status = FoodPlatformStatus.CONNECTED;
    account.otpSessionId = null;
    account.otpExpiresAt = null;

    // TODO: Lưu token từ ShopeeFood

    await this.accountRepo.save(account);

    return {
      success: true,
      message: 'Kết nối thành công',
      account: this.sanitizeAccount(account),
    };
  }

  /**
   * Ngắt kết nối
   */
  async disconnect(tenantId: string, id: string) {
    const account = await this.findOne(tenantId, id);

    account.status = FoodPlatformStatus.DISCONNECTED;
    account.accessToken = null;
    account.refreshToken = null;
    account.tokenExpiresAt = null;

    await this.accountRepo.save(account);

    return {
      success: true,
      message: 'Đã ngắt kết nối',
    };
  }

  // ====== Sync Methods (cho CCB) ======

  /**
   * Lấy danh sách cổng cho CCB sync
   * Chỉ trả về thông tin cần thiết, không trả về sensitive data
   */
  async getForCCBSync(tenantId: string, branchId: string) {
    const accounts = await this.accountRepo.find({
      where: { tenantId, branchId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    return accounts.map((a) => this.sanitizeAccount(a));
  }

  // ====== Helper Methods ======

  private getPlatformLabel(platform: FoodPlatformType): string {
    const labels = {
      [FoodPlatformType.GRAB]: 'Grab Food',
      [FoodPlatformType.BEFOOD]: 'BeFood',
      [FoodPlatformType.SHOPEE_FOOD]: 'ShopeeFood',
    };
    return labels[platform] || platform;
  }

  private getAuthType(platform: FoodPlatformType): FoodPlatformAuthType {
    if (platform === FoodPlatformType.SHOPEE_FOOD) {
      return FoodPlatformAuthType.PHONE_OTP;
    }
    return FoodPlatformAuthType.USERNAME_PASSWORD;
  }

  /**
   * Loại bỏ sensitive data trước khi trả về client
   */
  private sanitizeAccount(account: FoodPlatformAccount) {
    return {
      id: account.id,
      branchId: account.branchId,
      name: account.name,
      platform: account.platform,
      authType: account.authType,
      status: account.status,
      externalMerchantId: account.externalMerchantId,
      externalStoreName: account.externalStoreName,
      username: account.username, // Chỉ username, không password
      phoneNumber: account.phoneNumber,
      pollIntervalSeconds: account.pollIntervalSeconds,
      lastPollAt: account.lastPollAt,
      errorCount: account.errorCount,
      lastError: account.lastError,
      sortOrder: account.sortOrder,
      isActive: account.isActive,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
