import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440001'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  itemIds: string[];
}
