import {
  Body,
  Controller,
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
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { FindLoansDto } from './dto/find-loans.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

@ApiTags('loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new loan' })
  @ApiResponse({ status: 201, description: 'Loan created' })
  @ApiResponse({ status: 400, description: 'Invalid dates (R1)' })
  @ApiResponse({ status: 409, description: 'Item on loan (R2) or user limit reached (R3)' })
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  @HttpCode(200)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'List all loans with optional filters (admin/librarian)' })
  @ApiResponse({ status: 200, description: 'List of loans' })
  findAll(@Query() filters: FindLoansDto) {
    return this.loansService.findAll(filters);
  }

  @Get('overdue')
  @HttpCode(200)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'List overdue loans (admin/librarian)' })
  getOverdue() {
    return this.loansService.getOverdueLoans();
  }

  @Get('my-loans')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current user loans' })
  myLoans(@CurrentUser() user: AuthUser) {
    return this.loansService.findByUser(user.userId);
  }

  @Get('my-stats')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current user loan statistics' })
  myStats(@CurrentUser() user: AuthUser) {
    return this.loansService.getUserLoanStats(user.userId);
  }

  @Get('user/:userId')
  @HttpCode(200)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Get loans for a specific user (admin/librarian)' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.loansService.findByUser(userId);
  }

  @Get('user/:userId/stats')
  @HttpCode(200)
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Get loan stats for a specific user (admin/librarian)' })
  userStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.loansService.getUserLoanStats(userId);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a loan by id' })
  @ApiResponse({ status: 200, description: 'Loan details' })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @HttpCode(200)
  @ApiOperation({ summary: 'Return a loan' })
  @ApiResponse({ status: 200, description: 'Loan returned with fine calculation' })
  @ApiResponse({ status: 400, description: 'Already returned or lost (R5)' })
  returnLoan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReturnLoanDto) {
    return this.loansService.returnLoan(id, dto);
  }

  @Patch(':id/mark-lost')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a loan as lost' })
  @ApiResponse({ status: 200, description: 'Loan marked as lost' })
  @ApiResponse({ status: 400, description: 'Only active/overdue loans can be marked as lost (R5)' })
  markAsLost(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.markAsLost(id);
  }
}
