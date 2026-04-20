import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add admin accountability columns to the users table.
 *
 * These track how often an admin's resolution is overturned (i.e. at least
 * one objector was correct and the admin had to change the outcome).
 *
 * A high adminWrongResolutions / adminTotalResolutions ratio is a visible
 * red flag — both in the admin portal and in the public Telegram channel.
 */
export class AddAdminAccountabilityColumns1776083000000 implements MigrationInterface {
  name = "AddAdminAccountabilityColumns1776083000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminTotalResolutions" int NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminWrongResolutions" int NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "adminWrongResolutions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "adminTotalResolutions"`,
    );
  }
}
