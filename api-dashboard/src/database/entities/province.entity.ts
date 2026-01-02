import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Ward } from './ward.entity';

/**
 * Đơn vị hành chính cấp Tỉnh/Thành phố
 * Cập nhật theo Quyết định 19/2025/QĐ-TTg (34 tỉnh thành sau sáp nhập 07/2025)
 * Cấu trúc mới: Tỉnh/Thành phố → Xã/Phường (bỏ cấp Quận/Huyện)
 */
@Entity('provinces')
export class Province {
  @PrimaryColumn({ length: 10 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'name_en', length: 100, nullable: true })
  nameEn: string;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ name: 'full_name_en', length: 150, nullable: true })
  fullNameEn: string;

  @Column({ name: 'code_name', length: 50, nullable: true })
  codeName: string;

  // Loại đơn vị hành chính: thành phố trung ương, tỉnh
  @Column({ name: 'division_type', length: 50, nullable: true })
  divisionType: string;

  // Mã vùng điện thoại
  @Column({ name: 'phone_code', type: 'int', nullable: true })
  phoneCode: number;

  // Quan hệ trực tiếp với Xã/Phường (không qua Quận/Huyện)
  @OneToMany(() => Ward, (ward) => ward.province)
  wards: Ward[];
}
