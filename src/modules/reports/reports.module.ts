import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { FeeBill } from '../fee-bills/entities/fee-bill.entity';
import { PaymentTransaction } from '../transactions/entities/payment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeeBill, PaymentTransaction])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

