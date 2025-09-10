import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

type ListParams = {
    date?: string;
    classTypeId?: string;
    coachId?: string;
    page: number;
    limit: number;
};

@Injectable()
export class SessionsService {
    constructor(private readonly prisma: PrismaService) {}

    async list({ date, classTypeId, coachId, page, limit }: ListParams) {
        const where: any = {};
        if (date) {
            // ожидаем date в формате YYYY-MM-DD
            const d = new Date(date + 'T00:00:00.000Z');
            const start = new Date(d);
            const end = new Date(d);
            end.setUTCHours(23, 59, 59, 999);
            where.startsAt = { gte: start, lte: end };
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