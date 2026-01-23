import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'techres_app_food',
  password: process.env.DB_PASSWORD || 'techres_app_food',
  database: process.env.DB_DATABASE || 'techres_app_food',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
});
