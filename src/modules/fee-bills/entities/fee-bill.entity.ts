import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { PaymentTransaction } from '../../transactions/entities/payment-transaction.entity';

export enum FeeBillStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  ONLINE = 'ONLINE',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
}

@Entity({ name: 'fee_bills' })
@Index(['dueDate', 'paymentMethod'])
@Index(['status'])
export class FeeBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  referenceCode: string;

  @ManyToOne(() => Student, (student) => student.feeBills, { eager: true })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column()
  academicTerm: string;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amountDue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: 'enum', enum: FeeBillStatus, default: FeeBillStatus.PENDING })
  status: FeeBillStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @OneToMany(
    () => PaymentTransaction,
    (transaction) => transaction.feeBill,
    { cascade: true },
  )
  transactions: PaymentTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
