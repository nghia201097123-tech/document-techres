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
🚀 Upload Service is running!
📍 API: http://localhost:${port}/api
📚 Swagger: http://localhost:${port}/api/docs
  `);
}

bootstrap();
