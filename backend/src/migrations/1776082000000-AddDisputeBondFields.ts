import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add skin-in-the-game bond fields to the disputes table,
 * add bond status enum, and add disputeBondPool to markets.
 *
 * Dispute bond mechanics:
 *   - bondAmount  : BTN locked when objection is raised (2% of position, min 10)
 *   - bondStatus  : locked → rewarded (correct) | forfeited (wrong) | not_applicable (auto-settled)
 *
 * Market:
 *   - disputeBondPool : running total of forfeited bonds available to reward correct objectors
 */
export class AddDisputeBondFields1776082000000 implements MigrationInterface {
  name = "AddDisputeBondFields1776082000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the bond status enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "dispute_bond_status_enum" AS ENUM (
          'locked', 'rewarded', 'forfeited', 'not_applicable'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add bond columns to disputes
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "bondAmount" numeric(18,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "bondStatus" "dispute_bond_status_enum" NOT NULL DEFAULT 'locked'`,
    );

    // Add forfeit pool column to markets
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "disputeBondPool" numeric(18,2) NOT NULL DEFAULT 0`,
    );

    // Backfill: existing resolved disputes with no bond → mark not_applicable
    await queryRunner.query(`
      UPDATE "disputes"
      SET "bondStatus" = 'not_applicable'
      WHERE "upheld" IS NOT NULL AND "bondAmount" = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "disputeBondPool"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "bondStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "disputes" DROP COLUMN IF EXISTS "bondAmount"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "dispute_bond_status_enum"`);
  }
}
