import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix - exclude public routes for health checks
  app.setGlobalPrefix("api/v1", {
    exclude: ["api/public/health-check", "public/health-check"],
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // CORS - Allow all origins for APISIX Gateway
  app.enableCors({
    origin: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "x-svc-id"],
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Master Data API")
    .setDescription("API for syncing master data to CCB POS App")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.SERVICE_PORT || 1504;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  API-MASTER-DATA SERVICE                       ║
║            Syncing Master Data to CCB POS App                  ║
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
║   API_APP_FOOD: ${(process.env.CONFIG_API_NODEJS_APP_FOOD_URL || 'http://localhost:3010').padEnd(45)}║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   API: http://localhost:${port}/api/v1`.padEnd(63) + `║
║   Swagger: http://localhost:${port}/api/docs`.padEnd(63) + `║
╚════════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
