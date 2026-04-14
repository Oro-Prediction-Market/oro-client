import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPowerCards1775990000005 implements MigrationInterface {
  name = "AddPowerCards1775990000005";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add card_inventory JSONB to users (null = no cards yet)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "cardInventory" jsonb NULL
    `);

    // Add equipped_card to challenges
    await queryRunner.query(`
      ALTER TABLE "challenges"
      ADD COLUMN IF NOT EXISTS "equippedCard" varchar NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "equippedCard"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "cardInventory"`);
  }
}
