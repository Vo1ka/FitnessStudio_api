import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class SessionsQueryDto {
    @IsOptional() @IsString() date?: string; // YYYY-MM-DD
    @IsOptional() @IsString() classTypeId?: string;
    @IsOptional() @IsString() coachId?: string;
    @IsOptional() @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 20;
}