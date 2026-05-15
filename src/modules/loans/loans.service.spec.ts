import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { Loan, LoanStatus } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { UsersService } from '../users/users.service';
import { ItemsService } from '../items/items.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const mockUser = {
  id: 'user-1',
  email: 'student@example.com',
  firstName: 'Maria',
  lastName: 'Velasquez',
};

const mockItem = {
  id: 'item-1',
  title: 'Clean Code',
  code: 'LIB-001',
  type: 'book',
  isActive: true,
  isAvailable: true,
};

describe('LoansService', () => {
  let service: LoansService;
  let loansRepository: jest.Mocked<{
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  }>;
  let usersService: jest.Mocked<Pick<UsersService, 'findOne'>>;
  let itemsService: jest.Mocked<Pick<ItemsService, 'findOne'>>;

  beforeAll(() => {
    process.env.MAX_ACTIVE_LOANS = '3';
    process.env.DAILY_FINE_RATE = '0.50';
    process.env.MAX_LOAN_DAYS = '30';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ItemsService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    loansRepository = module.get(getRepositoryToken(Loan));
    usersService = module.get(UsersService);
    itemsService = module.get(ItemsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dueAt = new Date(Date.now() + 7 * MS_PER_DAY).toISOString();
    const dto: CreateLoanDto = { userId: mockUser.id, itemId: mockItem.id, dueAt };

    it('should create a loan successfully when item is available and user is under limit', async () => {
      const savedLoan = {
        id: 'loan-new',
        user: mockUser,
        item: mockItem,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
        dueAt: new Date(dueAt),
      };

      usersService.findOne.mockResolvedValue(mockUser as any);
      itemsService.findOne.mockResolvedValue(mockItem as any);
      loansRepository.findOne
        .mockResolvedValueOnce(null)              // R2: item not on loan
        .mockResolvedValueOnce(savedLoan as any); // final findOne after save
      loansRepository.count.mockResolvedValue(2); // R3: user has 2 loans (< 3)
      loansRepository.create.mockReturnValue(savedLoan as any);
      loansRepository.save.mockResolvedValue(savedLoan as any);

      const result = await service.create(dto);

      expect(result.status).toBe(LoanStatus.ACTIVE);
      expect(result.fineAmount).toBe(0);
      expect(loansRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: LoanStatus.ACTIVE, fineAmount: 0 }),
      );
    });

    it('should throw ConflictException if item already has an active loan (R2)', async () => {
      const existingLoan = { id: 'loan-existing-99', status: LoanStatus.ACTIVE };

      usersService.findOne.mockResolvedValue(mockUser as any);
      itemsService.findOne.mockResolvedValue(mockItem as any);
      loansRepository.findOne.mockResolvedValue(existingLoan as any); // item IS on loan

      const error = await service.create(dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toContain(existingLoan.id);
    });

    it('should throw ConflictException if user already has 3 active/overdue loans (R3)', async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);
      itemsService.findOne.mockResolvedValue(mockItem as any);
      loansRepository.findOne.mockResolvedValue(null); // R2: item is available
      loansRepository.count.mockResolvedValue(3);      // R3: user is at the limit

      const error = await service.create(dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toContain('3 active/overdue loans');
    });
  });

  // ─── returnLoan() ────────────────────────────────────────────────────────────

  describe('returnLoan()', () => {
    it('should calculate fine correctly for exactly 5 days overdue (R4)', async () => {
      const dueAt = new Date(Date.now() - 5 * MS_PER_DAY);
      const mockLoan = { id: 'loan-1', status: LoanStatus.ACTIVE, dueAt, notes: null };

      loansRepository.findOne.mockResolvedValue(mockLoan as any);
      loansRepository.save.mockImplementation(async (loan: unknown) => loan);

      const result = await service.returnLoan('loan-1', {} as ReturnLoanDto);

      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.fineAmount).toBe(2.5); // 5 days × $0.50
    });

    it('should apply Math.ceil when overdue is a fractional number of days (R4)', async () => {
      // 60 hours = 2.5 days  →  Math.ceil(2.5) = 3  →  fine = 3 × 0.50 = 1.50
      const dueAt = new Date(Date.now() - 60 * 60 * 1000 * 60);
      const mockLoan = { id: 'loan-2', status: LoanStatus.ACTIVE, dueAt, notes: null };

      loansRepository.findOne.mockResolvedValue(mockLoan as any);
      loansRepository.save.mockImplementation(async (loan: unknown) => loan);

      const result = await service.returnLoan('loan-2', {} as ReturnLoanDto);

      expect(result.fineAmount).toBe(1.5); // Math.ceil(2.5) × $0.50
    });

    it('should throw BadRequestException if loan is already returned (R5)', async () => {
      const mockLoan = { id: 'loan-3', status: LoanStatus.RETURNED, dueAt: new Date() };

      loansRepository.findOne.mockResolvedValue(mockLoan as any);

      const error = await service.returnLoan('loan-3', {} as ReturnLoanDto).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(
        "Cannot return a loan with status 'returned'",
      );
    });
  });
});
