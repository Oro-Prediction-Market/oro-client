import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Refactor disputes table to remove bond mechanics.
 *
 * BEFORE (bond-based disputes):
 *   - bondAmount decimal NOT NULL
 *   - bondPaymentId uuid nullable
 *   - bondRefunded boolean NOT NULL DEFAULT false
 *   - reason text nullable
 *
 * AFTER (free objections):
 *   - reason text NOT NULL  (required, describes why user objects)
 *   - upheld boolean nullable  (set after admin finalises resolution)
 *   - bondAmount / bondPaymentId / bondRefunded dropped
 *
 * Data migration: existing dispute rows with a reason are preserved;
 * rows without a reason get a placeholder text so NOT NULL is satisfied.
 */
export class RefactorDisputesToFreeObjections1776080000000 implements MigrationInterface {
  name = "RefactorDisputesToFreeObjections1776080000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Make reason temporarily nullable so existing rows aren't rejected
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "reason" TYPE text`,
    );

    // 2. Fill in a placeholder for any legacy rows that have no reason
    await queryRunner.query(
      `UPDATE "disputes" SET "reason" = 'Objection raised (no reason provided)' WHERE "reason" IS NULL`,
    );

    // 3. Enforce NOT NULL on reason going forward
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "reason" SET NOT NULL`,
    );

    // 4. Add the new upheld column (nullable — set only after resolution)
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "upheld" boolean DEFAULT NULL`,
    );

    // 5. Drop the old bond columns
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "bondAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "bondPaymentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "bondRefunded"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore bond columns (values cannot be recovered — defaulted to 0 / false)
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "bondAmount" decimal(18,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "bondPaymentId" uuid DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "bondRefunded" boolean NOT NULL DEFAULT false`,
    );

    // Drop the new columns
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "upheld"`,
    );

    // Make reason nullable again
    await queryRunner.query(
      `ALTER TABLE "disputes" ALTER COLUMN "reason" DROP NOT NULL`,
    );
  }
}
