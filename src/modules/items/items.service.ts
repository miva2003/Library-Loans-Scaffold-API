import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Item } from './entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';

export type ItemWithAvailability = Item & { isAvailable: boolean };

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
  ) {}

  async create(dto: CreateItemDto): Promise<Item> {
    const existing = await this.itemsRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Item with code "${dto.code}" already exists`);
    }
    const item = this.itemsRepository.create(dto);
    return this.itemsRepository.save(item);
  }

  async findAll(filters?: FindItemsDto): Promise<ItemWithAvailability[]> {
    const qb = this.baseQueryWithAvailability().where('item.isActive = :isActive', {
      isActive: true,
    });

    if (filters?.type) {
      qb.andWhere('item.type = :type', { type: filters.type });
    }

    const items = await qb.getMany();
    return items.map((item) => this.addIsAvailable(item));
  }

  async findOne(id: string): Promise<ItemWithAvailability> {
    const item = await this.baseQueryWithAvailability()
      .where('item.id = :id', { id })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getOne();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }
    return this.addIsAvailable(item);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.itemsRepository.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  private baseQueryWithAvailability(): SelectQueryBuilder<Item> {
    return this.itemsRepository
      .createQueryBuilder('item')
      .loadRelationCountAndMap(
        'item.activeLoansCount',
        'item.loans',
        'loan',
        (qb) =>
          qb.where('loan.status IN (:...statuses)', { statuses: ['active', 'overdue'] }),
      );
  }

  private addIsAvailable(item: Item): ItemWithAvailability {
    const count = (item as Item & { activeLoansCount: number }).activeLoansCount ?? 0;
    return { ...item, isAvailable: count === 0 };
  }
}
