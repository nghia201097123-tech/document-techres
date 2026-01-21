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

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

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
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.SERVICE_PORT ?? 4000;
  await app.listen(port);

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
