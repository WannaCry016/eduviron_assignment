import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { stringify } from 'csv-stringify/sync';
import { Repository } from 'typeorm';
import {
  FeeBill,
  FeeBillStatus,
} from '../fee-bills/entities/fee-bill.entity';
import {
  PaymentTransaction,
  TransactionStatus,
} from '../transactions/entities/payment-transaction.entity';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { PendingPaymentsQueryDto } from './dto/pending-payments-query.dto';
import { AuthenticatedUser } from '../../common/dto/authenticated-user.dto';

export interface DashboardMetrics {
  totals: {
    amountDue: number;
    amountCollected: number;
    outstanding: number;
    collectionRate: number;
  };
  breakdowns: {
    bySchool: Record<string, string | number>[];
    byPaymentMethod: Record<string, string | number>[];
    byGrade: Record<string, string | number>[];
  };
  outstandingSamples: Array<Record<string, unknown>>;
  generatedAt: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(FeeBill)
    private readonly feeBillRepository: Repository<FeeBill>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
  ) {}

  async getDashboard(
    filters: DashboardFiltersDto,
    user: AuthenticatedUser,
  ): Promise<DashboardMetrics> {
    const qb = this.createBaseBillQuery(filters);

    const totals = await qb
      .clone()
      .select('SUM(bill.amountDue)', 'amountDue')
      .addSelect('SUM(bill.amountPaid)', 'amountPaid')
      .getRawOne<{ amountDue: string; amountPaid: string }>();

    const bySchool = await qb
      .clone()
      .select('student.schoolName', 'schoolName')
      .addSelect('student.schoolId', 'schoolId')
      .addSelect('COUNT(bill.id)', 'billCount')
      .addSelect('SUM(bill.amountDue)', 'amountDue')
      .addSelect('SUM(bill.amountPaid)', 'amountPaid')
      .groupBy('student.schoolName')
      .addGroupBy('student.schoolId')
      .orderBy('SUM(bill.amountDue)', 'DESC')
      .limit(10)
      .getRawMany();

    const byPaymentMethod = await qb
      .clone()
      .select('bill.paymentMethod', 'paymentMethod')
      .addSelect('COUNT(bill.id)', 'billCount')
      .addSelect('SUM(bill.amountDue)', 'amountDue')
      .addSelect('SUM(bill.amountPaid)', 'amountPaid')
      .groupBy('bill.paymentMethod')
      .getRawMany();

    const byGrade = await qb
      .clone()
      .select('student.grade', 'grade')
      .addSelect('COUNT(bill.id)', 'billCount')
      .addSelect('SUM(bill.amountDue)', 'amountDue')
      .addSelect('SUM(bill.amountPaid)', 'amountPaid')
      .groupBy('student.grade')
      .orderBy('student.grade', 'ASC')
      .getRawMany();

    const outstandingStatuses = [
      FeeBillStatus.PENDING,
      FeeBillStatus.PARTIALLY_PAID,
    ];
    const outstandingSamplesRaw = await qb
      .clone()
      .select([
        'bill.referenceCode as referenceCode',
        'bill.amountDue as amountDue',
        'bill.amountPaid as amountPaid',
        'bill.dueDate as dueDate',
        'bill.status as status',
        'student.firstName as student_firstName',
        'student.lastName as student_lastName',
        'student.guardianEmail as student_guardianEmail',
        'student.guardianPhone as student_guardianPhone',
        'student.grade as student_grade',
        'student.schoolName as student_schoolName',
      ])
      .andWhere('bill.status IN (:...statuses)', {
        statuses: outstandingStatuses,
      })
      .orderBy('bill.dueDate', 'ASC')
      .limit(25)
      .getRawMany();

    const outstandingSamples = outstandingSamplesRaw.map((row) => ({
      referenceCode: row.referenceCode,
      status: row.status,
      dueDate: row.dueDate,
      amountDue: Number(row.amountDue),
      amountPaid: Number(row.amountPaid),
      student: {
        firstName: row.student_firstName,
        lastName: row.student_lastName,
        guardianEmail: row.student_guardianEmail,
        guardianPhone: row.student_guardianPhone,
        grade: row.student_grade,
        schoolName: row.student_schoolName,
      },
    }));

    const amountDue = Number(totals?.amountDue ?? 0);
    const amountCollected = Number(totals?.amountPaid ?? 0);

    return {
      totals: {
        amountDue,
        amountCollected,
        outstanding: Number((amountDue - amountCollected).toFixed(2)),
        collectionRate:
          amountDue === 0
            ? 0
            : Number((amountCollected / amountDue).toFixed(4)),
      },
      breakdowns: {
        bySchool,
        byPaymentMethod,
        byGrade,
      },
      outstandingSamples: this.maskFields(
        outstandingSamples,
        user?.fieldMasks ?? [],
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  async getPendingPayments(
    query: PendingPaymentsQueryDto,
    user: AuthenticatedUser,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.buildPendingPaymentsQuery(query);
    const [records, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const sanitized = this.maskFields(
      this.mapBillsToPlain(records),
      user?.fieldMasks ?? [],
    );

    return {
      total,
      page,
      limit,
      data: sanitized,
    };
  }

  async exportPendingPayments(
    query: PendingPaymentsQueryDto,
    user: AuthenticatedUser,
  ) {
    const qb = this.buildPendingPaymentsQuery(query);
    const maxRows = Math.min(query.limit ?? 500, 5000);
    const records = await qb.take(maxRows).getMany();
    const sanitized = this.maskFields(
      this.mapBillsToPlain(records),
      user?.fieldMasks ?? [],
    );

    const csvRows = sanitized.map((row) => ({
      referenceCode: row.referenceCode,
      status: row.status,
      dueDate: row.dueDate,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      paymentMethod: row.paymentMethod,
      studentFirstName: row.student?.firstName,
      studentLastName: row.student?.lastName,
      guardianEmail: row.student?.guardianEmail,
      guardianPhone: row.student?.guardianPhone,
      grade: row.student?.grade,
      schoolName: row.student?.schoolName,
    }));

    return stringify(csvRows, { header: true });
  }

  async getTransactionFailures(filters: {
    lastHours?: number;
    gateways?: string[];
  }) {
    const qb = this.transactionRepository
      .createQueryBuilder('txn')
      .leftJoinAndSelect('txn.feeBill', 'bill')
      .leftJoinAndSelect('bill.student', 'student')
      .where('txn.status = :status', { status: TransactionStatus.FAILED })
      .orderBy('txn.attemptedAt', 'DESC')
      .limit(100);

    if (filters.lastHours) {
      const from = new Date(Date.now() - filters.lastHours * 60 * 60 * 1000);
      qb.andWhere('txn.attemptedAt >= :from', { from });
    }

    if (filters.gateways?.length) {
      qb.andWhere('txn.paymentGateway IN (:...gateways)', {
        gateways: filters.gateways,
      });
    }

    return qb.getMany();
  }

  private buildPendingPaymentsQuery(query: PendingPaymentsQueryDto) {
    const qb = this.feeBillRepository
      .createQueryBuilder('bill')
      .leftJoinAndSelect('bill.student', 'student')
      .where('bill.status IN (:...statuses)', {
        statuses: [FeeBillStatus.PENDING, FeeBillStatus.PARTIALLY_PAID],
      })
      .orderBy('bill.dueDate', 'ASC');

    if (query.paymentMethod) {
      qb.andWhere('bill.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.status) {
      qb.andWhere('bill.status = :status', { status: query.status });
    }

    return qb;
  }

  private createBaseBillQuery(filters: DashboardFiltersDto) {
    const qb = this.feeBillRepository
      .createQueryBuilder('bill')
      .leftJoin('bill.student', 'student');

    if (filters.schoolId) {
      qb.andWhere('student.schoolId = :schoolId', {
        schoolId: filters.schoolId,
      });
    }

    if (filters.grade) {
      qb.andWhere('student.grade = :grade', { grade: filters.grade });
    }

    if (filters.paymentMethod) {
      qb.andWhere('bill.paymentMethod = :paymentMethod', {
        paymentMethod: filters.paymentMethod,
      });
    }

    if (filters.status) {
      qb.andWhere('bill.status = :status', { status: filters.status });
    }

    if (filters.from) {
      qb.andWhere('bill.dueDate >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('bill.dueDate <= :to', { to: filters.to });
    }

    return qb;
  }

  private mapBillsToPlain(records: FeeBill[]) {
    return records.map((record) => ({
      referenceCode: record.referenceCode,
      status: record.status,
      dueDate: record.dueDate,
      amountDue: record.amountDue,
      amountPaid: record.amountPaid,
      paymentMethod: record.paymentMethod,
      student: {
        firstName: record.student.firstName,
        lastName: record.student.lastName,
        guardianEmail: record.student.guardianEmail,
        guardianPhone: record.student.guardianPhone,
        grade: record.student.grade,
        schoolName: record.student.schoolName,
      },
    }));
  }

  private maskFields<T extends Record<string, any>>(
    rows: T[],
    fieldMasks: string[],
  ): T[] {
    if (!fieldMasks?.length) {
      return rows;
    }

    return rows.map((row) => {
      const clone: Record<string, any> = { ...row };
      fieldMasks.forEach((mask) => {
        const [root, child] = mask.split('.');
        if (child && clone[root]) {
          clone[root] = { ...clone[root] };
          delete clone[root][child];
        } else if (clone[root]) {
          delete clone[root];
        }
      });
      return clone as T;
    });
  }
}

