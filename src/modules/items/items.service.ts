import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FindItemsDto } from './dto/find-items.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
  ) {}

  async create(dto: CreateItemDto): Promise<Item> {
    const existing = await this.itemsRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Item with code ${dto.code} already exists`);
    }
    const item = this.itemsRepository.create({
      ...dto,
      availableQuantity: dto.quantity,
    });
    return this.itemsRepository.save(item);
  }

  async findAll(filters: FindItemsDto): Promise<Item[]> {
    const qb = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true });

    if (filters.type) {
      qb.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters.search) {
      qb.andWhere(
        '(item.title ILIKE :search OR item.author ILIKE :search OR item.isbn ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.availableOnly) {
      qb.andWhere('item.availableQuantity > 0');
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }
    return item;
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);

    if (dto.code && dto.code !== item.code) {
      const existing = await this.itemsRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`Item with code ${dto.code} already exists`);
      }
    }

    if (dto.quantity !== undefined) {
      const diff = dto.quantity - item.quantity;
      item.availableQuantity = Math.max(0, item.availableQuantity + diff);
    }

    Object.assign(item, dto);
    return this.itemsRepository.save(item);
  }

  async softDelete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  async decreaseAvailability(id: string, amount = 1): Promise<void> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item || item.availableQuantity < amount) {
      throw new BadRequestException(`Item ${id} is not available`);
    }
    item.availableQuantity -= amount;
    await this.itemsRepository.save(item);
  }

  async increaseAvailability(id: string, amount = 1): Promise<void> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }
    item.availableQuantity = Math.min(item.quantity, item.availableQuantity + amount);
    await this.itemsRepository.save(item);
  }

  async checkAvailability(id: string): Promise<boolean> {
    const item = await this.itemsRepository.findOne({ where: { id, isActive: true } });
    return item ? item.availableQuantity > 0 : false;
  }
}
