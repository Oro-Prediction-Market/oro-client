import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Rename windowHours → windowMinutes on the markets table.
 *
 * Old values were whole hours (1 or 2).
 * Migrate existing rows by multiplying by 60 so they remain correct.
 * New default is 60 (minutes).
 * Allowed values: 10, 20, 30, 60, 120.
 */
export class RenameWindowHoursToMinutes1776084000000 implements MigrationInterface {
  name = "RenameWindowHoursToMinutes1776084000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new column
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "windowMinutes" int NOT NULL DEFAULT 60`,
    );
    // Migrate existing data: old windowHours value × 60
    await queryRunner.query(
      `UPDATE "markets" SET "windowMinutes" = "windowHours" * 60 WHERE "windowHours" IS NOT NULL`,
    );
    // Drop old column
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "windowHours"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "windowHours" int NOT NULL DEFAULT 1`,
    );
    await queryRunner.query(
      `UPDATE "markets" SET "windowHours" = GREATEST(1, ROUND("windowMinutes" / 60.0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "windowMinutes"`,
    );
  }
}
