import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChallengeWager1775990000004 implements MigrationInterface {
  name = "AddChallengeWager1775990000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add VOID to challenge status enum
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "public"."challenges_status_enum" ADD VALUE IF NOT EXISTS 'void';
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // Wager amount (0 = free challenge)
    await queryRunner.query(`
      ALTER TABLE "challenges"
        ADD COLUMN IF NOT EXISTS "wagerAmount" numeric(18,2) NOT NULL DEFAULT 0
    `);

    // The user who accepted the challenge
    await queryRunner.query(`
      ALTER TABLE "challenges"
        ADD COLUMN IF NOT EXISTS "joinerId" uuid NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_challenges_joinerId'
        ) THEN
          ALTER TABLE "challenges"
            ADD CONSTRAINT "FK_challenges_joinerId"
            FOREIGN KEY ("joinerId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // Winner of the duel (null until settled)
    await queryRunner.query(`
      ALTER TABLE "challenges"
        ADD COLUMN IF NOT EXISTS "winnerId" uuid NULL
    `);

    // Settled/expired timestamp
    await queryRunner.query(`
      ALTER TABLE "challenges"
        ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP WITH TIME ZONE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "settledAt"`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "winnerId"`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_challenges_joinerId') THEN
          ALTER TABLE "challenges" DROP CONSTRAINT "FK_challenges_joinerId";
        END IF;
      END $$
    `);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "joinerId"`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "wagerAmount"`);
  }
}
