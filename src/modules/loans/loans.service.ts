import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { Item } from '../items/entities/item.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';
import { UsersService } from '../users/users.service';
import { ItemsService } from '../items/items.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    private readonly usersService: UsersService,
    private readonly itemsService: ItemsService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateLoanDto): Promise<Loan> {
    const user = await this.usersService.findOne(dto.userId);

    const activeCount = await this.loansRepository.count({
      where: { user: { id: dto.userId }, status: LoanStatus.ACTIVE },
    });
    const maxActive = this.configService.get<number>('loans.maxActivePerUser') ?? 3;
    if (activeCount >= maxActive) {
      throw new BadRequestException(`User has reached the maximum of ${maxActive} active loans`);
    }

    const items: Item[] = [];
    for (const itemId of dto.itemIds) {
      const item = await this.itemsService.findOne(itemId);
      const available = await this.itemsService.checkAvailability(itemId);
      if (!available) {
        throw new BadRequestException(`Item ${itemId} is not available`);
      }
      items.push(item);
    }

    const maxLoanDays = this.configService.get<number>('loans.maxLoanDays') ?? 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + maxLoanDays);

    const loan = this.loansRepository.create({
      user,
      items,
      dueAT: dueDate,
      status: LoanStatus.ACTIVE,
    });

    const saved = await this.loansRepository.save(loan);

    for (const item of items) {
      await this.itemsService.decreaseAvailability(item.id);
    }

    return this.findOne(saved.id);
  }

  async findAll(filters: FindLoansDto): Promise<Loan[]> {
    const qb = this.loansRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.items', 'items');

    if (filters.status) {
      qb.andWhere('loan.status = :status', { status: filters.status });
    }

    if (filters.userId) {
      qb.andWhere('user.id = :userId', { userId: filters.userId });
    }

    if (filters.overdueOnly) {
      qb.andWhere('loan.dueDate < :now', { now: new Date() }).andWhere(
        'loan.status = :activeStatus',
        { activeStatus: LoanStatus.ACTIVE },
      );
    }

    return qb.orderBy('loan.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id },
      relations: ['user', 'items'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan ${id} not found`);
    }
    return loan;
  }

  async returnLoan(id: string, dto: ReturnLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException(`Loan ${id} is not active`);
    }

    const now = new Date();
    loan.returnedAT = now;
    loan.status = LoanStatus.RETURNED;

    if (now > loan.dueAT) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysLate = Math.ceil((now.getTime() - loan.dueAT.getTime()) / msPerDay);
      const dailyRate = this.configService.get<number>('loans.dailyFineRate') ?? 0.5;
      loan.fineAmount = daysLate * dailyRate;
    }

    if (dto.notes) {
      loan.notes = dto.notes;
    }

    const saved = await this.loansRepository.save(loan);

    for (const item of loan.items) {
      await this.itemsService.increaseAvailability(item.id);
    }

    return saved;
  }

  async cancelLoan(id: string, notes?: string): Promise<Loan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException(`Loan ${id} is not active`);
    }

    loan.status = LoanStatus.CANCELLED;
    if (notes) {
      loan.notes = notes;
    }

    const saved = await this.loansRepository.save(loan);

    for (const item of loan.items) {
      await this.itemsService.increaseAvailability(item.id);
    }

    return saved;
  }

  async findByUser(userId: string, status?: LoanStatus): Promise<Loan[]> {
    const qb = this.loansRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.items', 'items')
      .where('user.id = :userId', { userId });

    if (status) {
      qb.andWhere('loan.status = :status', { status });
    }

    return qb.orderBy('loan.createdAt', 'DESC').getMany();
  }

  async getOverdueLoans(): Promise<Loan[]> {
    return this.loansRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.items', 'items')
      .where('loan.dueDate < :now', { now: new Date() })
      .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
      .orderBy('loan.dueDate', 'ASC')
      .getMany();
  }

  async getUserLoanStats(
    userId: string,
  ): Promise<{ total: number; active: number; returned: number; overdue: number }> {
    const [total, active, returned, overdue] = await Promise.all([
      this.loansRepository.count({ where: { user: { id: userId } } }),
      this.loansRepository.count({
        where: { user: { id: userId }, status: LoanStatus.ACTIVE },
      }),
      this.loansRepository.count({
        where: { user: { id: userId }, status: LoanStatus.RETURNED },
      }),
      this.loansRepository
        .createQueryBuilder('loan')
        .where('loan.userId = :userId', { userId })
        .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
        .andWhere('loan.dueDate < :now', { now: new Date() })
        .getCount(),
    ]);

    return { total, active, returned, overdue };
  }
}
