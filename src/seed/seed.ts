import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import AppDataSource from '../../data-source';
import {
  Student,
  StudentStatus,
} from '../modules/students/entities/student.entity';
import {
  FeeBill,
  FeeBillStatus,
  PaymentMethod,
} from '../modules/fee-bills/entities/fee-bill.entity';
import {
  PaymentTransaction,
  TransactionStatus,
} from '../modules/transactions/entities/payment-transaction.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { ROLE_POLICIES } from '../modules/auth/role-policies';

const SCHOOL_COUNT = Number(process.env.SEED_SCHOOL_COUNT ?? 25);
const STUDENTS_PER_SCHOOL = Number(process.env.SEED_STUDENTS_PER_SCHOOL ?? 40);
const BILLS_PER_STUDENT = Number(process.env.SEED_BILLS_PER_STUDENT ?? 3);
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'ChangeMe123!';

async function seedUsers(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const role of Object.values(UserRole)) {
    const username = role.toLowerCase();
    const existing = await userRepo.findOne({ where: { username } });
    if (existing) {
      continue;
    }

    const policy = ROLE_POLICIES[role];
    await userRepo.save(
      userRepo.create({
        username,
        passwordHash,
        role,
        permissions: policy.permissions,
        fieldMasks: policy.fieldMasks,
      }),
    );
  }
}

async function seedStudentsAndFinancials() {
  const studentRepo = AppDataSource.getRepository(Student);
  const feeBillRepo = AppDataSource.getRepository(FeeBill);
  const txnRepo = AppDataSource.getRepository(PaymentTransaction);

  // Delete all records (using query builder to avoid empty criteria error)
  await AppDataSource.createQueryBuilder().delete().from(PaymentTransaction).execute();
  await AppDataSource.createQueryBuilder().delete().from(FeeBill).execute();
  await AppDataSource.createQueryBuilder().delete().from(Student).execute();

  const schools = Array.from({ length: SCHOOL_COUNT }).map(() => ({
    id: faker.string.uuid(),
    name: `${faker.company.name()} School`,
  }));

  const students: Student[] = [];
  for (const school of schools) {
    for (let i = 0; i < STUDENTS_PER_SCHOOL; i += 1) {
      students.push(
        studentRepo.create({
          externalId: faker.string.uuid(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          grade: faker.helpers.arrayElement(['K', '1', '2', '3', '4', '5', '6']),
          schoolId: school.id,
          schoolName: school.name,
          guardianEmail: faker.internet.email(),
          guardianPhone: faker.phone.number(),
          status: faker.helpers.arrayElement(Object.values(StudentStatus)),
        }),
      );
    }
  }

  const savedStudents = await studentRepo.save(students);
  const feeBills: FeeBill[] = [];
  const transactions: PaymentTransaction[] = [];

  savedStudents.forEach((student) => {
    for (let i = 0; i < BILLS_PER_STUDENT; i += 1) {
      const amountDue = Number(faker.finance.amount({ min: 100, max: 1500, dec: 2 }));
      const status = faker.helpers.arrayElement([
        FeeBillStatus.PAID,
        FeeBillStatus.PARTIALLY_PAID,
        FeeBillStatus.PENDING,
      ]);
      const paymentMethod = faker.helpers.arrayElement(Object.values(PaymentMethod));
      const amountPaid =
        status === FeeBillStatus.PAID
          ? amountDue
          : status === FeeBillStatus.PARTIALLY_PAID
            ? Number((amountDue * faker.number.float({ min: 0.3, max: 0.8 })).toFixed(2))
            : 0;

      const bill = feeBillRepo.create({
        referenceCode: faker.string.alphanumeric(12).toUpperCase(),
        student,
        academicTerm: `Term ${faker.number.int({ min: 1, max: 3 })} ${new Date().getFullYear()}`,
        dueDate: faker.date.between({ from: '2024-01-01', to: '2024-12-31' }),
        amountDue,
        amountPaid,
        status,
        paymentMethod,
      });
      feeBills.push(bill);
    }
  });

  const savedBills = await feeBillRepo.save(feeBills);

  savedBills.forEach((bill) => {
    const txnCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < txnCount; i += 1) {
      const status =
        bill.status === FeeBillStatus.PAID
          ? TransactionStatus.SUCCESS
          : faker.helpers.arrayElement([
              TransactionStatus.SUCCESS,
              TransactionStatus.FAILED,
              TransactionStatus.PENDING,
            ]);

      transactions.push(
        txnRepo.create({
          feeBill: bill,
          status,
          paymentGateway: faker.helpers.arrayElement(['flutterwave', 'stripe', 'paystack']),
          paymentReference: faker.string.alphanumeric(16).toUpperCase(),
          attemptedAt: faker.date.recent({ days: 60 }),
          failureReason:
            status === TransactionStatus.FAILED ? faker.lorem.sentence() : undefined,
          metadata: {
            ip: faker.internet.ip(),
          },
        }),
      );
    }
  });

  await txnRepo.save(transactions);
}

async function bootstrap() {
  await AppDataSource.initialize();
  console.info('Connected to database. Starting seed...');
  await seedUsers();
  console.info('Seeded role-based users');
  await seedStudentsAndFinancials();
  console.info('Seeded students, bills, and transactions');
  await AppDataSource.destroy();
  console.info('Done.');
}

bootstrap().catch(async (error) => {
  console.error('Seeding failed', error);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});

