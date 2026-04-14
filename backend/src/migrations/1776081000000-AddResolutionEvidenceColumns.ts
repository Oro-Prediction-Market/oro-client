import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add resolution transparency columns to the markets table.
 *
 * New columns:
 *   - evidenceUrl        varchar nullable  — public link to proof (screenshot / official page)
 *   - evidenceNote       text nullable     — admin's plain-language explanation
 *   - evidenceSubmittedAt timestamptz null  — when evidence was published
 *   - resolvedByAdminId  varchar nullable  — user ID of admin who finalised resolution
 *   - windowHours        int default 1     — objection window length (1 or 2 hours)
 */
export class AddResolutionEvidenceColumns1776081000000 implements MigrationInterface {
  name = "AddResolutionEvidenceColumns1776081000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "evidenceUrl" varchar DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "evidenceNote" text DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "evidenceSubmittedAt" timestamptz DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "resolvedByAdminId" varchar DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" ADD COLUMN IF NOT EXISTS "windowHours" int NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "windowHours"`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "resolvedByAdminId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "evidenceSubmittedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "evidenceNote"`,
    );
    await queryRunner.query(
      `ALTER TABLE "markets" DROP COLUMN IF EXISTS "evidenceUrl"`,
    );
  }
}
