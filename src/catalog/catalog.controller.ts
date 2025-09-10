import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalog: CatalogService) {}

    @Get('class-types')
    getClassTypes() {
        return this.catalog.getClassTypes();
    }

    @Get('coaches')
    getCoaches() {
        return this.catalog.getCoaches();
    }
}
