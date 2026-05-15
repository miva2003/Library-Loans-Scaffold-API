import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISBN, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class CreateItemDto {
  @ApiProperty({ example: 'Clean Code' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Robert C. Martin' })
  @IsString()
  @IsNotEmpty()
  author?: string;

  @ApiProperty({ example: '9780132350884' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: ItemType })
  @IsEnum(ItemType)
  type: ItemType;

  @ApiProperty({ example: 2008 })
  @IsInt()
  @Min(1000)
  publicationYear?: number;

  @ApiProperty({ example: 5, minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'A book about writing clean code' })
  @IsOptional()
  @IsString()
  description?: string;
}
