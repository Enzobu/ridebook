import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const corsOrigin = process.env["CORS_ORIGIN"] ?? "http://localhost:3000";

  app.enableCors({
    credentials: true,
    origin: corsOrigin.split(",").map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.setGlobalPrefix("api/v1", {
    exclude: ["health", "ready"],
  });

  const config = new DocumentBuilder()
    .setTitle("Ridebook API")
    .setDescription("API de gestion des balades Ridebook")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = Number(process.env["PORT"] ?? 3000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
