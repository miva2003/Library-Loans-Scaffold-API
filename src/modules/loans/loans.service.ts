import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';
import { UsersService } from '../users/users.service';
import { ItemsService } from '../items/items.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    private readonly usersService: UsersService,
    private readonly itemsService: ItemsService,
  ) {}

  async create(dto: CreateLoanDto): Promise<Loan> {
    const user = await this.usersService.findOne(dto.userId);
    const item = await this.itemsService.findOne(dto.itemId);

    const loanedAt = new Date();
    const dueAt = new Date(dto.dueAt);

    // R1: dueAt must be after loanedAt
    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt must be a future date');
    }

    // R1: loan window must not exceed MAX_LOAN_DAYS
    const maxLoanDays = parseInt(process.env.MAX_LOAN_DAYS ?? '30', 10);
    const diffDays = (dueAt.getTime() - loanedAt.getTime()) / MS_PER_DAY;
    if (diffDays > maxLoanDays) {
      throw new BadRequestException(`Loan period cannot exceed ${maxLoanDays} days`);
    }

    // R2: item must not have an active or overdue loan
    const existingLoan = await this.loansRepository.findOne({
      where: [
        { item: { id: item.id }, status: LoanStatus.ACTIVE },
        { item: { id: item.id }, status: LoanStatus.OVERDUE },
      ],
    });
    if (existingLoan) {
      throw new ConflictException(
        `Item "${item.title}" is currently on loan (loanId: ${existingLoan.id})`,
      );
    }

    // R3: user must not have >= MAX_ACTIVE_LOANS active/overdue loans
    const maxActiveLoans = parseInt(process.env.MAX_ACTIVE_LOANS ?? '3', 10);
    const userActiveCount = await this.loansRepository.count({
      where: [
        { user: { id: user.id }, status: LoanStatus.ACTIVE },
        { user: { id: user.id }, status: LoanStatus.OVERDUE },
      ],
    });
    if (userActiveCount >= maxActiveLoans) {
      throw new ConflictException(
        `User already has ${maxActiveLoans} active/overdue loans`,
      );
    }

    const loan = this.loansRepository.create({
      user,
      item,
      dueAt,
      status: LoanStatus.ACTIVE,
      fineAmount: 0,
    });

    const saved = await this.loansRepository.save(loan);
    return this.findOne(saved.id);
  }

  async findAll(filters?: FindLoansDto): Promise<Loan[]> {
    await this.updateOverdueLoans();

    const qb = this.loansRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.item', 'item');

    if (filters?.status) {
      qb.andWhere('loan.status = :status', { status: filters.status });
    }
    if (filters?.userId) {
      qb.andWhere('user.id = :userId', { userId: filters.userId });
    }
    if (filters?.itemId) {
      qb.andWhere('item.id = :itemId', { itemId: filters.itemId });
    }

    return qb.orderBy('loan.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id },
      relations: ['user', 'item'],
    });
    if (!loan) {
      throw new NotFoundException(`Loan ${id} not found`);
    }
    return loan;
  }

  async returnLoan(id: string, dto: ReturnLoanDto): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: cannot return if already returned or lost
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException(
        `Cannot return a loan with status '${loan.status}'`,
      );
    }

    const returnedAt = new Date();
    loan.returnedAt = returnedAt;
    // R4: status is ALWAYS 'returned'
    loan.status = LoanStatus.RETURNED;

    // R4: fine = Math.ceil(daysOverdue) * DAILY_FINE_RATE
    const daysOverdue = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - loan.dueAt.getTime()) / MS_PER_DAY),
    );
    const dailyFineRate = parseFloat(process.env.DAILY_FINE_RATE ?? '0.5');
    loan.fineAmount = daysOverdue * dailyFineRate;

    if (dto.notes) {
      loan.notes = dto.notes;
    }

    return this.loansRepository.save(loan);
  }

  async markAsLost(id: string): Promise<Loan> {
    const loan = await this.findOne(id);

    // R5: only active or overdue loans can be marked as lost
    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw new BadRequestException('Only active or overdue loans can be marked as lost');
    }

    loan.status = LoanStatus.LOST;
    return this.loansRepository.save(loan);
  }

  async findByUser(userId: string, status?: LoanStatus): Promise<Loan[]> {
    const qb = this.loansRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.user', 'user')
      .leftJoinAndSelect('loan.item', 'item')
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
      .leftJoinAndSelect('loan.item', 'item')
      .where('loan.dueAt < :now', { now: new Date() })
      .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
      .orderBy('loan.dueAt', 'ASC')
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
      this.loansRepository.count({
        where: { user: { id: userId }, status: LoanStatus.OVERDUE },
      }),
    ]);

    return { total, active, returned, overdue };
  }

  private async updateOverdueLoans(): Promise<void> {
    await this.loansRepository
      .createQueryBuilder()
      .update(Loan)
      .set({ status: LoanStatus.OVERDUE })
      .where('status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('"dueAt" < NOW()')
      .andWhere('"returnedAt" IS NULL')
      .execute();
  }
}
