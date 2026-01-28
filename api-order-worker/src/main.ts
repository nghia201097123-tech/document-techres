import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('OrderWorkerService');
  const app = await NestFactory.create(AppModule);

  // Global prefix (exclude /api/public routes)
  app.setGlobalPrefix('api/v1', {
    exclude: ['/api/public/health-check', '/api/public/(.*)'],
  });

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.SERVICE_PORT || 3011;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  API-ORDER-WORKER SERVICE                      ║
║         Poll Orders from Platforms, Save DB, Push Realtime     ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Database (App Food):                                           ║
║   HOST: ${(process.env.CONFIG_POSTGRESQL_HOST_APP_FOOD || '172.16.10.146').padEnd(53)}║
║   PORT: ${(process.env.CONFIG_POSTGRESQL_PORT_APP_FOOD || '5432').padEnd(53)}║
║   DATABASE: ${(process.env.CONFIG_POSTGRESQL_DB_NAME_APP_FOOD || 'techres_app_food').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Redis:                                                         ║
║   HOST: ${(process.env.CONFIG_REDIS_HOST || '172.16.10.71').padEnd(53)}║
║   PORT: ${(process.env.CONFIG_REDIS_PORT || '6379').padEnd(53)}║
║   DB: ${(process.env.CONFIG_REDIS_DB || '6').padEnd(55)}║
╠════════════════════════════════════════════════════════════════╣
║ Polling:                                                       ║
║   INTERVAL: ${(process.env.DEFAULT_POLL_INTERVAL_SECONDS || '30')}s`.padEnd(63) + `║
║   TIMEOUT: ${(process.env.POLL_TIMEOUT_MS || '10000')}ms`.padEnd(63) + `║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api/v1`.padEnd(63) + `║
║   WebSocket: ws://localhost:${port}/orders`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
