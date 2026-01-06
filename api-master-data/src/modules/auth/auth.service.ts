import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch, Device, Staff } from '../../entities';
import { LoginDto, LoginResponseDto, VerifyPinDto, VerifyPinResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    // Find branch by store code
    const branch = await this.branchRepository.findOne({
      where: { storeCode: loginDto.storeCode, status: 'active' },
    });

    if (!branch) {
      throw new NotFoundException('Không tìm thấy cửa hàng với mã này');
    }

    // Register or update device
    let device = await this.deviceRepository.findOne({
      where: { deviceId: loginDto.deviceId },
    });

    if (device) {
      // Update existing device
      device.branchId = branch.id;
      device.deviceName = loginDto.deviceName || device.deviceName;
      device.deviceType = loginDto.deviceType || device.deviceType;
      device.appVersion = loginDto.appVersion || device.appVersion;
      device.isActive = true;
    } else {
      // Create new device
      device = this.deviceRepository.create({
        branchId: branch.id,
        deviceId: loginDto.deviceId,
        deviceName: loginDto.deviceName,
        deviceType: loginDto.deviceType || 'android',
        appVersion: loginDto.appVersion,
        isActive: true,
      });
    }

    await this.deviceRepository.save(device);

    // Generate JWT token
    const payload = {
      branchId: branch.id,
      deviceId: loginDto.deviceId,
      storeCode: branch.storeCode,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      branchId: branch.id,
      branchName: branch.name,
      brandName: '', // TODO: Join with brand table
      deviceId: loginDto.deviceId,
    };
  }

  async verifyPin(branchId: string, verifyPinDto: VerifyPinDto): Promise<VerifyPinResponseDto> {
    const staff = await this.staffRepository.findOne({
      where: {
        branchId,
        pinCode: verifyPinDto.pinCode,
        isActive: true,
      },
    });

    if (!staff) {
      throw new UnauthorizedException('Mã PIN không đúng');
    }

    return {
      staffId: staff.id,
      staffName: staff.name,
      staffCode: staff.code,
      role: staff.role,
      avatarUrl: staff.avatarUrl || '',
    };
  }

  async validateToken(payload: any): Promise<any> {
    const branch = await this.branchRepository.findOne({
      where: { id: payload.branchId, status: 'active' },
    });

    if (!branch) {
      throw new UnauthorizedException('Branch không hợp lệ');
    }

    return {
      branchId: branch.id,
      storeCode: branch.storeCode,
      deviceId: payload.deviceId,
    };
  }
}
