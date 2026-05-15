import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from '../../items/entities/item.entity';

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  loanedAt: Date;

  @Column({ type: 'timestamp' })
  dueAT: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAT: Date;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  fineAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => User, (user) => user.loans)
  user: User;

  @ManyToMany(() => Item, (item) => item.loans)
  @JoinTable()
  items: Item[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
