import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Item created' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Public()
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List items with optional type filter' })
  @ApiResponse({ status: 200, description: 'List of items with isAvailable field' })
  findAll(@Query() filters: FindItemsDto) {
    return this.itemsService.findAll(filters);
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get an item by id' })
  @ApiResponse({ status: 200, description: 'Item with isAvailable field' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Update an item' })
  @ApiResponse({ status: 200, description: 'Updated item' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Soft-delete an item (admin only)' })
  @ApiResponse({ status: 204, description: 'Item deleted' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.softDelete(id);
  }
}
