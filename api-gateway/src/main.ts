import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable built-in body parser to use custom one with higher limit
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: false,
  });

  // Increase body size limit for large imports (e.g., Excel with 1000+ rows)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // No global prefix - gateway is a transparent proxy
  // Routes are determined by the path prefix:
  // /api/tenant/* -> api-dashboard
  // /api/* -> api-admin (default)

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('TechRes API Gateway')
    .setDescription('API Gateway for TechRes Offline Web Admin')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('gateway', 'Gateway endpoints')
    .addTag('proxy', 'Proxied endpoints to backend services')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.SERVICE_PORT ?? 4000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    API-GATEWAY SERVICE                         ║
║              TechRes Offline Web Admin Gateway                 ║
╠════════════════════════════════════════════════════════════════╣
║ App Settings:                                                  ║
║   SERVICE_PORT: ${String(port).padEnd(45)}║
║   NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║
╠════════════════════════════════════════════════════════════════╣
║ Backend Services:                                              ║
║   API_ADMIN: ${(process.env.CONFIG_API_NODEJS_ADMIN_URL || 'http://localhost:1502').padEnd(48)}║
║   API_MANAGEMENT: ${(process.env.CONFIG_API_NODEJS_MANAGEMENT_URL || 'http://localhost:1503').padEnd(43)}║
║   API_OAUTH: ${(process.env.CONFIG_API_NODEJS_OAUTH_URL || 'http://localhost:1506').padEnd(48)}║
║   API_SOCKET: ${(process.env.CONFIG_API_NODEJS_SOCKET_URL || 'http://localhost:1507').padEnd(47)}║
║   API_WEBHOOK: ${(process.env.CONFIG_API_NODEJS_WEBHOOK_URL || 'http://localhost:1508').padEnd(46)}║
╠════════════════════════════════════════════════════════════════╣
║ Web Frontend (CORS):                                           ║
║   WEB_ADMIN: ${(process.env.CONFIG_WEB_ADMIN_URL || 'http://localhost:1500').padEnd(48)}║
║   WEB_DASHBOARD: ${(process.env.CONFIG_WEB_DASHBOARD_URL || 'http://localhost:1501').padEnd(44)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   Gateway: http://localhost:${port}`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/docs`.padEnd(63) + `║
║   Socket.IO: ws://localhost:${port}/payment`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
