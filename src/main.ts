import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port,'0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
