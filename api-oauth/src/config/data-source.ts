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
  host: configService.get('CONFIG_POSTGRESQL_HOST_OAUTH') || 'localhost',
  port: configService.get('CONFIG_POSTGRESQL_PORT_OAUTH') || 5432,
  username: configService.get('CONFIG_POSTGRESQL_USERNAME_OAUTH') || 'postgres',
  password: configService.get('CONFIG_POSTGRESQL_PASSWORD_OAUTH') || 'postgres',
  database: configService.get('CONFIG_POSTGRESQL_DB_NAME_OAUTH') || 'fnbpos_oauth',
  entities: [User, RefreshToken, Session, PasswordReset, AuditLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
});
