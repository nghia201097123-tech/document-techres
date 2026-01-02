import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Province } from './province.entity';
import { Ward } from './ward.entity';

@Entity('districts')
export class District {
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

  @Column({ name: 'province_code', length: 10 })
  provinceCode: string;

  @ManyToOne(() => Province, (province) => province.districts)
  @JoinColumn({ name: 'province_code', referencedColumnName: 'code' })
  province: Province;

  @OneToMany(() => Ward, (ward) => ward.district)
  wards: Ward[];
}
