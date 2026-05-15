import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  LIBRARIAN = 'librarian',
  MEMBER = 'member',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @OneToMany('Loan', 'user')
  loans: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  }
}
