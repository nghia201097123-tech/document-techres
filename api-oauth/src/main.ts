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

  // CORS - Allow all origins for APISIX Gateway
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-svc-id'],
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
╔════════════════════════════════════════════════════════════════╗
║                     API-OAUTH SERVICE                          ║
║           OAuth Authentication Service for FNB POS             ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Database (OAuth):                                              ║
║   HOST: ${(process.env.CONFIG_POSTGRESQL_HOST_OAUTH || '172.16.10.146').padEnd(53)}║
║   PORT: ${(process.env.CONFIG_POSTGRESQL_PORT_OAUTH || '5432').padEnd(53)}║
║   DATABASE: ${(process.env.CONFIG_POSTGRESQL_DB_NAME_OAUTH || 'fnbpos_oauth').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Security:                                                      ║
║   JWT_EXPIRES_IN: ${(process.env.JWT_EXPIRES_IN || '30d').padEnd(43)}║
║   THROTTLE_LIMIT: ${(process.env.THROTTLE_LIMIT || '10').padEnd(43)}║
║   2FA_APP_NAME: ${(process.env.TWO_FACTOR_APP_NAME || 'FNB_POS').padEnd(45)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api/docs`.padEnd(63) + `║
║   Health: http://localhost:${port}/health`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
