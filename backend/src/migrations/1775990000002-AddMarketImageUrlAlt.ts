import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarketImageUrlAlt1775990000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "markets"
      ADD COLUMN IF NOT EXISTS "imageUrlAlt" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "markets"
      DROP COLUMN IF EXISTS "imageUrlAlt";
    `);
  }
}
