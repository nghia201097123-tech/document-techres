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
    .setTitle('Socket.IO Service')
    .setDescription('Microservice for real-time payment notifications via Socket.IO')
    .setVersion('1.0')
    .addTag('socket')
    .addTag('events')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.SERVICE_PORT || 1507;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SOCKET-SERVICE                              ║
║          Real-time Payment Notifications via Socket.IO         ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   HTTP: http://localhost:${port}`.padEnd(63) + `║
║   WebSocket: ws://localhost:${port}`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
