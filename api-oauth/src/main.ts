import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Validation
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

  // CORS
  const corsOrigins = configService.get('cors.origins');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API OAuth')
    .setDescription('OAuth Authentication Service for FNB POS System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Login, Register, Logout, Token management')
    .addTag('2FA', 'Two-Factor Authentication')
    .addTag('Sessions', 'Session management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = configService.get('port');
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      API OAUTH SERVICE                        ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    Running                                           ║
║  Port:      ${port}                                              ║
║  Docs:      http://localhost:${port}/api/docs                    ║
║  Health:    http://localhost:${port}/health                      ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
