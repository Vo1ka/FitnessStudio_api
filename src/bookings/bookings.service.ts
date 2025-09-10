import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class BookingsService {
    constructor(private readonly prisma: PrismaService) {}

    async my(userId: string, page = 1, limit = 20) {
        const where = { userId, status: 'BOOKED' as const };
        const [items, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                include: {
                    session: {
                        include: { classType: true, coach: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.booking.count({ where }),
        ]);
        return { items, total, page, limit };
    }

    async findById(id: string) {
        return this.prisma.booking.findUnique({ where: { id } });
    }

    async cancel(bookingId: string) {
        await this.prisma.$transaction(async (tx) => {
            const b = await tx.booking.findUnique({ where: { id: bookingId } });
            if (!b || b.status === 'CANCELLED') return;

            await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' },
            });

            // Попробовать продвинуть очередь
            await this.promoteNextInWaitlistTx(tx, b.sessionId);
        });
    }

    async create(userId: string, sessionId: string) {
        // атомарная проверка в транзакции
        return this.prisma.$transaction(async (tx) => {
            // 1) Сессия должна существовать
            const session = await tx.classSession.findUnique({
                where: { id: sessionId },
                select: { id: true, capacity: true, startsAt: true },
            });
            if (!session) {
                throw new NotFoundException('Session not found');
            }

            // 2) Пользователь не должен иметь активную бронь на эту сессию
            const existing = await tx.booking.findUnique({
                where: { userId_sessionId: { userId, sessionId } }, // нужен @@unique([userId, sessionId])
            });
            if (existing && existing.status === 'BOOKED') {
                throw new BadRequestException('Already booked');
            }

            // 3) Проверка capacity по текущему количеству BOOKED
            const currentCount = await tx.booking.count({
                where: { sessionId, status: 'BOOKED' },
            });
            if (currentCount >= session.capacity) {
                throw new BadRequestException('Session is full');
            }

            // 4) Создаём бронь (если была CANCELLED — можно создать новую запись или «реактивировать»)
            // Вариант A: реактивировать запись
            if (existing && existing.status === 'CANCELLED') {
                return tx.booking.update({
                    where: { id: existing.id },
                    data: { status: 'BOOKED' },
                    include: { session: { include: { classType: true, coach: true } } },
                });
            }

            // Вариант B: создать новую
            return tx.booking.create({
                data: { userId, sessionId, status: 'BOOKED' },
                include: { session: { include: { classType: true, coach: true } } },
            });
        }, { timeout: 10000 });
    }
    async joinWaitlist(userId: string, sessionId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Проверки: нет активной брони, нет активной заявки в очереди
            const [booking, existingWL] = await Promise.all([
                tx.booking.findUnique({ where: { userId_sessionId: { userId, sessionId } } }),
                tx.waitlistEntry.findUnique({ where: { userId_sessionId: { userId, sessionId } } }),
            ]);
            if (booking?.status === 'BOOKED') {
                throw new BadRequestException('Already booked');
            }
            if (existingWL && existingWL.status === 'PENDING') {
                return existingWL; // уже в очереди
            }

            // Вычислить следующий position
            const last = await tx.waitlistEntry.findFirst({
                where: { sessionId },
                orderBy: { position: 'desc' },
                select: { position: true },
            });
            const nextPos = (last?.position ?? 0) + 1;

            // Создать/обновить
            if (existingWL && existingWL.status === 'CANCELLED') {
                return tx.waitlistEntry.update({
                    where: { id: existingWL.id },
                    data: { status: 'PENDING', position: nextPos },
                });
            }
            return tx.waitlistEntry.create({
                data: { userId, sessionId, position: nextPos },
            });
        });
    
    }
    private async promoteNextInWaitlistTx(tx: Prisma.TransactionClient, sessionId: string) {
        const [session, bookedCount] = await Promise.all([
            tx.classSession.findUnique({ where: { id: sessionId }, select: { capacity: true } }),
            tx.booking.count({ where: { sessionId, status: 'BOOKED' } }),
        ]);
        if (!session) return;
        if (bookedCount >= session.capacity) return;

        const next = await tx.waitlistEntry.findFirst({
            where: { sessionId, status: 'PENDING' },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });
        if (!next) return;

        const existing = await tx.booking.findUnique({
            where: { userId_sessionId: { userId: next.userId, sessionId } },
        });
        if (existing?.status === 'BOOKED') {
            await tx.waitlistEntry.update({ where: { id: next.id }, data: { status: 'CANCELLED' } });
            return this.promoteNextInWaitlistTx(tx, sessionId);
        }

        await tx.booking.create({ data: { userId: next.userId, sessionId, status: 'BOOKED' } });
        await tx.waitlistEntry.update({ where: { id: next.id }, data: { status: 'PROMOTED' } });
    }
    
}
