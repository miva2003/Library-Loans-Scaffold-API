import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './entities/loan.entity';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { UsersModule } from '../users/users.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [TypeOrmModule.forFeature([Loan]), UsersModule, ItemsModule],
  providers: [LoansService],
  controllers: [LoansController],
})
export class LoansModule {}
