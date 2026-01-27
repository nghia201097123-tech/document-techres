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

  // CORS
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
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
  console.log(`Master Data API is running on port ${port}`);
}
bootstrap();
