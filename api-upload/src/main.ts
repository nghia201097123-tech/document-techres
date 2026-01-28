import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS - Allow all origins for APISIX Gateway
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-svc-id'],
    credentials: true,
  });

  // API prefix - exclude public health-check for gateway
  app.setGlobalPrefix('api', {
    exclude: ['api/public/health-check'],
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('TechRes Upload API')
    .setDescription('API service for file uploads using MinIO')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('uploads', 'File upload operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('SERVICE_PORT', 1505);
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    API-UPLOAD SERVICE                          ║
║              TechRes File Upload Service (MinIO)               ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ MinIO Storage:                                                 ║
║   ENDPOINT: ${(process.env.CONFIG_MINIO_ENDPOINT || '172.16.10.218').padEnd(49)}║
║   PORT: ${(process.env.CONFIG_MINIO_PORT || '30900').padEnd(53)}║
║   BUCKET: ${(process.env.CONFIG_MINIO_BUCKET || 'techres-uploads').padEnd(51)}║
║   SSL: ${(process.env.CONFIG_MINIO_ENABLE_SSL || 'false').padEnd(54)}║
╠════════════════════════════════════════════════════════════════╣
║ Upload Limits:                                                 ║
║   MAX_IMAGE: ${(process.env.MAX_IMAGE_SIZE || '10')}MB`.padEnd(63) + `║
║   MAX_VIDEO: ${(process.env.MAX_VIDEO_SIZE || '100')}MB`.padEnd(63) + `║
║   MAX_DOCUMENT: ${(process.env.MAX_DOCUMENT_SIZE || '50')}MB`.padEnd(63) + `║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api/docs`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
