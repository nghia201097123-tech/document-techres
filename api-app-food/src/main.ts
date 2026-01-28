import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('SERVICE_PORT', 3010);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('TechRes Food Platform API')
    .setDescription(
      'API App Food - Single Backend Service cho tích hợp Food Platform (GrabFood, ShopeeFood, BeFood)',
    )
    .setVersion('1.0')
    .addTag('accounts', 'Quản lý tài khoản merchant')
    .addTag('stores', 'Mapping cửa hàng')
    .addTag('orders', 'Quản lý đơn hàng')
    .addTag('products', 'Mapping sản phẩm (Future)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    API-APP-FOOD SERVICE                        ║
║           Food Platform Integration (Grab/Shopee/Be)           ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
║   API_PREFIX: /${apiPrefix}`.padEnd(63) + `║
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
║ Supported Platforms:                                           ║
║   • GrabFood                                                   ║
║   • ShopeeFood                                                 ║
║   • BeFood                                                     ║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/${apiPrefix}`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/docs`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
