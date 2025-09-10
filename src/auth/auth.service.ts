import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new BadRequestException('Email already registered');
        }
        const password = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, password, name: dto.name },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        return user;
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');
        const ok = await bcrypt.compare(dto.password, user.password);
        if (!ok) throw new UnauthorizedException('Invalid credentials');

        const accessToken = await this.signAccessToken({ sub: user.id, role: user.role });
        const refreshToken = await this.signRefreshToken({ sub: user.id, type: 'refresh' });

        return { accessToken, refreshToken };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) throw new UnauthorizedException('No refresh token');

        let payload: any;
        try {
            payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_SECRET });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
        if (payload?.type !== 'refresh') throw new UnauthorizedException('Invalid token type');

        // Можно внедрить ротацию и трек stored refresh tokens в БД — по желанию
        const accessToken = await this.signAccessToken({ sub: payload.sub, role: payload.role });
        const newRefresh = await this.signRefreshToken({ sub: payload.sub, type: 'refresh' });

        return { accessToken, refreshToken: newRefresh };
    }

    private signAccessToken(payload: Record<string, any>) {
        const expiresIn = process.env.ACCESS_TOKEN_TTL || '15m';
        return this.jwt.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn });
    }

    private signRefreshToken(payload: Record<string, any>) {
        const expiresIn = process.env.REFRESH_TOKEN_TTL || '30d';
        return this.jwt.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn });
    }

    attachRefreshCookie(res: Response, refreshToken: string) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || 'localhost',
            path: '/',
            maxAge: this.ttlToMs(process.env.REFRESH_TOKEN_TTL || '30d'),
        });
    }

    clearRefreshCookie(res: Response) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refresh_token', '', {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || 'localhost',
            path: '/',
            maxAge: 0,
        });
    }

    private ttlToMs(ttl: string) {
        // Примитивный разбор '15m', '30d', '1h'
        const m = /^(\d+)([smhd])$/.exec(ttl);
        if (!m) return 30 * 24 * 60 * 60 * 1000;
        const n = Number(m[1]);
        const unit = m[2];
        switch (unit) {
            case 's':
                return n * 1000;
            case 'm':
                return n * 60 * 1000;
            case 'h':
                return n * 60 * 60 * 1000;
            case 'd':
                return n * 24 * 60 * 60 * 1000;
            default:
                return n;
        }
    }
}
