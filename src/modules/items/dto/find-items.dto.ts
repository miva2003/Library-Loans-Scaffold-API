import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class FindItemsDto {
  @ApiPropertyOptional({ enum: ItemType })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @ApiPropertyOptional({ example: 'clean code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  availableOnly?: boolean;
}
