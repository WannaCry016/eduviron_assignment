import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  FeeBillStatus,
  PaymentMethod,
} from '../../fee-bills/entities/fee-bill.entity';

export class DashboardFiltersDto {
  @IsOptional()
  @IsUUID('4')
  schoolId?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(FeeBillStatus)
  status?: FeeBillStatus;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

