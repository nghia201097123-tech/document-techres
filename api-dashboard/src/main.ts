import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable built-in body parser to use custom one with higher limit
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Increase body size limit for large imports (e.g., Excel with 1000+ rows)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // CORS - Allow all origins for APISIX Gateway
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-svc-id'],
    credentials: true,
  });

  // Global prefix - exclude PayOS routes and health-check for gateway
  app.setGlobalPrefix('api', {
    exclude: [
      'payos',
      'payos/(.*)',
      'health',
      'api/public/health-check',
    ],
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
    .setTitle('TechRes Dashboard API')
    .setDescription('API for TechRes Web Dashboard (Staff/Owner login)')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.SERVICE_PORT ?? 1503;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                   API-DASHBOARD SERVICE                        ║
║           TechRes Web Dashboard (Staff/Owner) API              ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Database (TechRes):                                            ║
║   HOST: ${(process.env.CONFIG_POSTGRESQL_HOST_TECHRES || '172.16.10.146').padEnd(53)}║
║   PORT: ${(process.env.CONFIG_POSTGRESQL_PORT_TECHRES || '5432').padEnd(53)}║
║   DATABASE: ${(process.env.CONFIG_POSTGRESQL_DB_NAME_TECHRES || 'techres').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Internal Services:                                             ║
║   API_SOCKET: ${(process.env.CONFIG_API_NODEJS_SOCKET_URL || 'http://localhost:1507').padEnd(47)}║
║   API_WEBHOOK: ${(process.env.CONFIG_API_NODEJS_WEBHOOK_URL || 'http://localhost:1508').padEnd(46)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api/docs`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
