import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Student } from './src/modules/students/entities/student.entity';
import { FeeBill } from './src/modules/fee-bills/entities/fee-bill.entity';
import { PaymentTransaction } from './src/modules/transactions/entities/payment-transaction.entity';
import { User } from './src/modules/users/entities/user.entity';

const envFiles = [process.env.ENV_PATH, '.env.local', '.env'].filter(
  (filePath): filePath is string => !!filePath && existsSync(filePath),
);

envFiles.forEach((filePath) =>
  config({
    path: filePath,
    override: true,
  }),
);

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'reporting',
  entities: [Student, FeeBill, PaymentTransaction, User],
  migrations: ['src/database/migrations/*.ts'],
  logging: process.env.TYPEORM_LOGGING === 'true',
  synchronize: false,
});

export default AppDataSource;

