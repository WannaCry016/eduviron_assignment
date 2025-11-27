import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction])],
  exports: [TypeOrmModule],
})
export class TransactionsModule {}

