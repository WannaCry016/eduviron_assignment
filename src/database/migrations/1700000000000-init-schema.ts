import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TYPE "public"."students_status_enum" AS ENUM('ACTIVE','INACTIVE','GRADUATED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."feebills_status_enum" AS ENUM('PENDING','PARTIALLY_PAID','PAID','FAILED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."feebills_paymentmethod_enum" AS ENUM('ONLINE','CASH','BANK_TRANSFER','CHEQUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."paymenttransactions_status_enum" AS ENUM('SUCCESS','FAILED','PENDING','CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN','SCHOOL_ADMIN','FINANCE_ANALYST','DEVELOPER')`,
    );

    await queryRunner.query(`
      CREATE TABLE "students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "externalId" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "grade" character varying NOT NULL,
        "schoolId" character varying NOT NULL,
        "schoolName" character varying NOT NULL,
        "guardianEmail" character varying NOT NULL,
        "guardianPhone" character varying NOT NULL,
        "status" "public"."students_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_students_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_students_external" ON "students" ("externalId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_students_school_grade" ON "students" ("schoolId","grade")`,
    );

    await queryRunner.query(`
      CREATE TABLE "fee_bills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referenceCode" character varying NOT NULL,
        "student_id" uuid NOT NULL,
        "academicTerm" character varying NOT NULL,
        "dueDate" DATE NOT NULL,
        "amountDue" numeric(12,2) NOT NULL,
        "amountPaid" numeric(12,2) NOT NULL DEFAULT 0,
        "status" "public"."feebills_status_enum" NOT NULL DEFAULT 'PENDING',
        "paymentMethod" "public"."feebills_paymentmethod_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fee_bills_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fee_bills_student" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_fee_bills_due_payment" ON "fee_bills" ("dueDate","paymentMethod")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fee_bills_status" ON "fee_bills" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fee_bill_id" uuid NOT NULL,
        "status" "public"."paymenttransactions_status_enum" NOT NULL,
        "paymentGateway" character varying NOT NULL,
        "paymentReference" character varying NOT NULL,
        "attemptedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "failureReason" character varying,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_transactions_fee_bill" FOREIGN KEY ("fee_bill_id") REFERENCES "fee_bills"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_status_attempted" ON "payment_transactions" ("status","attemptedAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "permissions" text[] NOT NULL DEFAULT '{}',
        "fieldMasks" text[] NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_username" ON "users" ("username")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_username"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_transactions_status_attempted"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fee_bills_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fee_bills_due_payment"`,
    );
    await queryRunner.query(`DROP TABLE "fee_bills"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_students_school_grade"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_students_external"`,
    );
    await queryRunner.query(`DROP TABLE "students"`);
    await queryRunner.query(
      `DROP TYPE "public"."users_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."paymenttransactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."feebills_paymentmethod_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."feebills_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."students_status_enum"`,
    );
  }
}

