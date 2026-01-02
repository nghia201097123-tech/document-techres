import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { District } from './district.entity';

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

  @Column({ name: 'district_code', length: 10 })
  districtCode: string;

  @ManyToOne(() => District, (district) => district.wards)
  @JoinColumn({ name: 'district_code', referencedColumnName: 'code' })
  district: District;
}
