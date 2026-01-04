import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Province } from './province.entity';

/**
 * Đơn vị hành chính cấp Xã/Phường
 * Cập nhật theo Quyết định 19/2025/QĐ-TTg (sau sáp nhập 07/2025)
 * Xã/Phường thuộc trực tiếp Tỉnh/Thành phố (không còn cấp Quận/Huyện)
 */
@Entity('wards')
export class Ward {
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

  // Loại đơn vị hành chính: phường, xã, thị trấn
  @Column({ name: 'division_type', length: 50, nullable: true })
  divisionType: string;

  // Mã viết tắt
  @Column({ name: 'short_codename', length: 100, nullable: true })
  shortCodename: string;

  // Liên kết trực tiếp với Tỉnh/Thành phố (không qua Quận/Huyện)
  @Column({ name: 'province_code', length: 10 })
  provinceCode: string;

  @ManyToOne(() => Province, (province) => province.wards)
  @JoinColumn({ name: 'province_code', referencedColumnName: 'code' })
  province: Province;
}
