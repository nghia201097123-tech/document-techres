import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.CONFIG_POSTGRESQL_HOST_MASTER || '172.16.10.146',
  port: parseInt(process.env.CONFIG_POSTGRESQL_PORT_MASTER || '5432', 10),
  username: process.env.CONFIG_POSTGRESQL_USERNAME_MASTER || 'techres_app_food',
  password: process.env.CONFIG_POSTGRESQL_PASSWORD_MASTER || 'techres_app_food',
  database: process.env.CONFIG_POSTGRESQL_DB_NAME_MASTER || 'techres_app_food',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
});
