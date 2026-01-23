import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FoodPlatformAccount } from './food-platform-account.entity';

/**
 * Food Platform Port Entity
 * Cấu hình các platform được phép sử dụng trong hệ thống
 * Được quản lý bởi Web Admin
 */
@Entity('food_platform_ports')
export class FoodPlatformPort {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Platform info
  @Column({ type: 'varchar', length: 50, unique: true })
  platform: string; // grab, shopee_food, befood

  @Column({ type: 'varchar', length: 100, name: 'display_name' })
  displayName: string; // GrabFood, ShopeeFood

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string; // Brand color (#00B14F)

  // API Configuration
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_id' })
  clientId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'client_secret' })
  clientSecret: string; // Encrypted

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'api_base_url' })
  apiBaseUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'webhook_url' })
  webhookUrl: string;

  // Auth config
  @Column({
    type: 'jsonb',
    name: 'supported_auth_types',
    default: '["username_password"]',
  })
  supportedAuthTypes: string[]; // ["username_password", "phone_otp"]

  // Status
  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => FoodPlatformAccount, (account) => account.port)
  accounts: FoodPlatformAccount[];
}
