// src/sessions/sessions.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessions: SessionsService) {}

    @Get()
    list(
        @Query('date') date?: string,
        @Query('classTypeId') classTypeId?: string,
        @Query('coachId') coachId?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.sessions.list({ date, classTypeId, coachId, page: Number(page), limit: Number(limit) });
    }

    @Get(':id')
    detail(@Param('id') id: string) {
        return this.sessions.detail(id);
    }
}
