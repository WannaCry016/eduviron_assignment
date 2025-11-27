import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeBill } from './entities/fee-bill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeeBill])],
  exports: [TypeOrmModule],
})
export class FeeBillsModule {}

