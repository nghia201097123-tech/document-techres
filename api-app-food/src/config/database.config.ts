import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.CONFIG_POSTGRESQL_HOST_APP_FOOD || '172.16.10.146',
  port: parseInt(process.env.CONFIG_POSTGRESQL_PORT_APP_FOOD || '5432', 10),
  username: process.env.CONFIG_POSTGRESQL_USERNAME_APP_FOOD || 'techres_app_food',
  password: process.env.CONFIG_POSTGRESQL_PASSWORD_APP_FOOD || 'techres_app_food',
  database: process.env.CONFIG_POSTGRESQL_DB_NAME_APP_FOOD || 'techres_app_food',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [__dirname + '/../database/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
}));
