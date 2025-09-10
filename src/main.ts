import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,           // отбрасывает лишние поля
            transform: true,           // приводит типы по DTO
            forbidNonWhitelisted: true // 400, если пришли лишние поля
        }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
    app.enableCors({
      origin: ['http://localhost:3000'], // прод-домены позже
      credentials: true,                  // для куки
    });
}
bootstrap();
