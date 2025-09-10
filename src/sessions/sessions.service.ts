// src/sessions/sessions.service.ts
import { Injectable } from '@nestjs/common';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { PrismaService } from 'prisma/prisma.service';

type ListParams = { date?: string; classTypeId?: string; coachId?: string; page: number; limit: number };

@Injectable()
export class SessionsService {
    constructor(private readonly prisma: PrismaService) {}

    async list({ date, classTypeId, coachId, page, limit }: ListParams) {
        const where: any = {};
        if (date) {
            const d = new Date(date);
            where.startsAt = { gte: startOfDay(d), lte: endOfDay(d) };
        }
        if (classTypeId) where.classTypeId = classTypeId;
        if (coachId) where.coachId = coachId;

        const [items, total] = await Promise.all([
            this.prisma.classSession.findMany({
                where,
                include: { classType: true, coach: true },
                orderBy: { startsAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.classSession.count({ where }),
        ]);

        return { items, total, page, limit };
    }

    detail(id: string) {
        return this.prisma.classSession.findUnique({
            where: { id },
            include: { classType: true, coach: true, bookings: true },
        });
    }
}
