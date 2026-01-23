import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('SERVICE_PORT', 3006);
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
╔══════════════════════════════════════════════════════════════╗
║                   API APP FOOD - TechRes                      ║
║              Food Platform Integration Service                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}                    ║
║  API Docs:          http://localhost:${port}/docs               ║
║  API Prefix:        /${apiPrefix}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Supported Platforms:                                         ║
║  • GrabFood                                                   ║
║  • ShopeeFood                                                 ║
║  • BeFood                                                     ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
