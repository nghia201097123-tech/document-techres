import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { District } from './district.entity';

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

  @OneToMany(() => District, (district) => district.province)
  districts: District[];
}
