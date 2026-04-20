import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreOutcomeTotalBetAmount1776085000000 implements MigrationInterface {
  name = "RestoreOutcomeTotalBetAmount1776085000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Re-add totalBetAmount column (was accidentally renamed to imageUrl in a prior migration).
    // We sum actual placed bets from positions to backfill existing rows.
    await queryRunner.query(`
      ALTER TABLE "outcomes"
      ADD COLUMN IF NOT EXISTS "totalBetAmount" numeric(18,2) NOT NULL DEFAULT 0
    `);

    // Backfill from positions table so existing markets reflect real pool shares
    await queryRunner.query(`
      UPDATE "outcomes" o
      SET "totalBetAmount" = COALESCE(
        (SELECT SUM(p.amount) FROM "positions" p WHERE p."outcomeId" = o.id AND p.status != 'refunded'),
        0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outcomes" DROP COLUMN IF EXISTS "totalBetAmount"`,
    );
  }
}
