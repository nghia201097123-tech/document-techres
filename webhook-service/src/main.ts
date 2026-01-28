import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PayOS Webhook Service')
    .setDescription('Microservice for handling PayOS payment webhooks')
    .setVersion('1.0')
    .addTag('webhook')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.SERVICE_PORT || 1508;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    WEBHOOK-SERVICE                             ║
║            PayOS Payment Webhook Handler                       ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Internal Services:                                             ║
║   API_SOCKET: ${(process.env.CONFIG_API_NODEJS_SOCKET_URL || 'http://localhost:1507').padEnd(47)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   Webhook: http://localhost:${port}/webhook`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
