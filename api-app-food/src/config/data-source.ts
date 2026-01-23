import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.CONFIG_POSTGRESQL_HOST || '172.16.10.146',
  port: parseInt(process.env.CONFIG_POSTGRESQL_PORT || '5432', 10),
  username: process.env.CONFIG_POSTGRESQL_USERNAME || 'fnbpos_oauth',
  password: process.env.CONFIG_POSTGRESQL_PASSWORD || 'fnbpos_oauth',
  database: process.env.CONFIG_POSTGRESQL_DB_NAME || 'fnbpos_oauth',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
});
