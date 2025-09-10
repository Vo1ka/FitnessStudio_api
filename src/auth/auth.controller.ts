import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.auth.register(dto);
        return { user };
    }

    @HttpCode(200)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken } = await this.auth.login(dto);
        this.auth.attachRefreshCookie(res, refreshToken);
        return { accessToken, refreshToken };
    }

    @HttpCode(200)
    @Post('refresh')
    async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken } = await this.auth.refresh(dto.refreshToken);
        this.auth.attachRefreshCookie(res, refreshToken);
        return { accessToken, refreshToken };
    }

    @HttpCode(200)
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        this.auth.clearRefreshCookie(res);
        return { ok: true };
    }
}
