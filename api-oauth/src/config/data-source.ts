import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import {
  User,
  RefreshToken,
  Session,
  PasswordReset,
  AuditLog,
} from '../entities';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: configService.get('DB_PORT') || 5432,
  username: configService.get('DB_USERNAME') || 'postgres',
  password: configService.get('DB_PASSWORD') || 'postgres',
  database: configService.get('DB_DATABASE') || 'fnbpos_oauth',
  entities: [User, RefreshToken, Session, PasswordReset, AuditLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
});
