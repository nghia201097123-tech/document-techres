import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for base64 images (50MB)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // CORS - Allow all origins for APISIX Gateway
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-svc-id'],
    credentials: true,
  });

  // Global prefix - exclude public health-check for gateway
  app.setGlobalPrefix('api', {
    exclude: ['api/public/health-check'],
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('TechRes Admin API')
    .setDescription('API for TechRes Web Admin Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.SERVICE_PORT ?? 1502;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    API-ADMIN SERVICE                           ║
║              TechRes Web Admin Management API                  ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Database (Master):                                             ║
║   HOST: ${(process.env.CONFIG_POSTGRESQL_HOST_MASTER || '172.16.10.146').padEnd(53)}║
║   PORT: ${(process.env.CONFIG_POSTGRESQL_PORT_MASTER || '5432').padEnd(53)}║
║   DATABASE: ${(process.env.CONFIG_POSTGRESQL_DB_NAME_MASTER || 'techres_master').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Internal Services:                                             ║
║   API_MANAGEMENT: ${(process.env.CONFIG_API_NODEJS_MANAGEMENT_URL || 'http://localhost:1503').padEnd(43)}║
║   API_APP_FOOD: ${(process.env.CONFIG_API_NODEJS_APP_FOOD_URL || 'http://localhost:3010').padEnd(45)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api/docs`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
