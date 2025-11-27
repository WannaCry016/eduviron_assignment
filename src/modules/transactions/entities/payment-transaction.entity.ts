import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FeeBill } from '../../fee-bills/entities/fee-bill.entity';

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'payment_transactions' })
@Index(['status', 'attemptedAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => FeeBill, (feeBill) => feeBill.transactions)
  @JoinColumn({ name: 'fee_bill_id' })
  feeBill: FeeBill;

  @Column({ name: 'fee_bill_id' })
  feeBillId: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column()
  paymentGateway: string;

  @Column()
  paymentReference: string;

  @Column({ type: 'timestamptz' })
  attemptedAt: Date;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
