import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniquePaymentIdToTransactions1776088000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "UQ_transactions_paymentId" UNIQUE ("paymentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT "UQ_transactions_paymentId"
    `);
  }
}
