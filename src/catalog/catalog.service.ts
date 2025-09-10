import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CatalogService {
    constructor(private readonly prisma: PrismaService) {}

    getClassTypes() {
        return this.prisma.classType.findMany({
            orderBy: { title: 'asc' },
        });
    }

    getCoaches() {
        return this.prisma.coach.findMany({
            orderBy: { name: 'asc' },
        });
    }
}
