import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('OrderWorkerService');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

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

  logger.log(`🚀 Order Worker Service is running on port ${port}`);
  logger.log(`📚 API: http://localhost:${port}/api/v1`);
  logger.log(`🔌 WebSocket: ws://localhost:${port}/orders`);
}

bootstrap();
