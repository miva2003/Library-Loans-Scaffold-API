import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Create a new item (admin/librarian)' })
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List items with optional filters (public)' })
  findAll(@Query() filters: FindItemsDto) {
    return this.itemsService.findAll(filters);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an item by id (public)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Update an item (admin/librarian)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Soft-delete an item (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.softDelete(id);
  }
}
