// все клиенты получают одинаковую форму ответа об ошибке.
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const resp: any = exception.getResponse();
            message = typeof resp === 'string' ? resp : resp?.message || exception.message || message;
            code = typeof resp === 'object' && resp?.code ? resp.code : code;
        }

        res.status(status).json({
            error: {
                code,
                message,
                path: req.url,
                timestamp: new Date().toISOString(),
            },
        });
    }
}