import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ItemType {
  BOOK = 'book',
  MAGAZINE = 'magazine',
  EQUIPMENT = 'equipment',
}

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: ItemType })
  type: ItemType;

  @Column()
  publicationYear: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ default: 1 })
  availableQuantity: number;

  @Column({ default: true })
  isActive: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ManyToMany('Loan', 'items')
  loans: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
