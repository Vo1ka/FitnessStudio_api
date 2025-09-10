import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatalogModule } from './catalog/catalog.module';
import { SessionsModule } from './sessions/sessions.module';
import { BookingsModule } from './bookings/bookings.module';
@Module({
  imports: [PrismaModule, AuthModule, UsersModule, CatalogModule, SessionsModule, BookingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
