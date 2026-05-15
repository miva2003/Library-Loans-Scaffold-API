import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReturnLoanDto {
  @ApiPropertyOptional({ example: 'Returned in good condition' })
  @IsOptional()
  @IsString()
  notes?: string;
}
