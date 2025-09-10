import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
    constructor(private readonly bookings: BookingsService) {}

    @Get('my')
    async myBookings(
        @CurrentUser() user: { userId: string; role?: string },
        @Query() { page = 1, limit = 20 }: PaginationDto,
    ) {
        return this.bookings.my(user.userId, Number(page), Math.min(Number(limit), 100));
    }

    @HttpCode(201)
    @Post()
    async create(
        @CurrentUser() user: { userId: string; role?: string },
        @Body() dto: CreateBookingDto,
    ) {
        return this.bookings.create(user.userId, dto.sessionId);
    }

    @HttpCode(200)
    @Post(':id/cancel')
    async cancel(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string; role?: string },
    ) {
        const booking = await this.bookings.findById(id);
        if (!booking) {
            return { ok: true }; // идемпотентная отмена
        }
        if (booking.userId !== user.userId && user.role !== 'ADMIN') {
            throw new ForbiddenException('Not allowed');
        }
        await this.bookings.cancel(id);
        return { ok: true };
    }
}
