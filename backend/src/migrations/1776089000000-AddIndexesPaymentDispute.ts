import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesPaymentDispute1776089000000
  implements MigrationInterface
{
  name = "AddIndexesPaymentDispute1776089000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status" ON "payments" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_userId" ON "disputes" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disputes_bondStatus" ON "disputes" ("bondStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_disputes_bondStatus"`);
    await queryRunner.query(`DROP INDEX "IDX_disputes_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_userId"`);
  }
}
