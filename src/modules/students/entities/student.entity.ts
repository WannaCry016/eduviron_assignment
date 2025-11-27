import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FeeBill } from '../../fee-bills/entities/fee-bill.entity';

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
}

@Entity({ name: 'students' })
@Index(['schoolId', 'grade'])
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  externalId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  grade: string;

  @Column()
  schoolId: string;

  @Column()
  schoolName: string;

  @Column()
  guardianEmail: string;

  @Column()
  guardianPhone: string;

  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  @OneToMany(() => FeeBill, (bill) => bill.student)
  feeBills: FeeBill[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
