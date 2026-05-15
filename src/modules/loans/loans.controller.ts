import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new loan' })
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Get()
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'List all loans with filters (admin/librarian)' })
  findAll(@Query() filters: FindLoansDto) {
    return this.loansService.findAll(filters);
  }

  @Get('overdue')
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'List all overdue loans (admin/librarian)' })
  getOverdue() {
    return this.loansService.getOverdueLoans();
  }

  @Get('my-loans')
  @ApiOperation({ summary: 'Get current user loans' })
  myLoans(@CurrentUser() user: AuthUser) {
    return this.loansService.findByUser(user.userId);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get current user loan statistics' })
  myStats(@CurrentUser() user: AuthUser) {
    return this.loansService.getUserLoanStats(user.userId);
  }

  @Get('user/:userId')
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Get loans for a specific user (admin/librarian)' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.loansService.findByUser(userId);
  }

  @Get('user/:userId/stats')
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Get loan stats for a specific user (admin/librarian)' })
  userStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.loansService.getUserLoanStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a loan by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Return a loan' })
  returnLoan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReturnLoanDto) {
    return this.loansService.returnLoan(id, dto);
  }

  @Patch(':id/cancel')
  @Roles('admin', 'librarian')
  @ApiOperation({ summary: 'Cancel a loan (admin/librarian)' })
  cancelLoan(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReturnLoanDto) {
    return this.loansService.cancelLoan(id, body.notes);
  }
}
