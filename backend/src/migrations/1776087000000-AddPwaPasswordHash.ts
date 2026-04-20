import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPwaPasswordHash1776087000000 implements MigrationInterface {
  name = "AddPwaPasswordHash1776087000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "pwaPasswordHash" varchar NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "pwaPasswordHash"
    `);
  }
}
