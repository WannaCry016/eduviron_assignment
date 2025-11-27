import { IsEnum, IsOptional } from 'class-validator';
import {
  FeeBillStatus,
  PaymentMethod,
} from '../../fee-bills/entities/fee-bill.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PendingPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(FeeBillStatus)
  status?: FeeBillStatus;
}

