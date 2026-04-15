import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add dispute_bond_lock, dispute_bond_forfeit, dispute_bond_reward
 * to the transactions_type_enum in PostgreSQL.
 *
 * These values were added to the TypeScript TransactionType enum in the
 * bond mechanics feature but were never applied to the DB enum, causing
 * "invalid input value for enum transactions_type_enum" on dispute submission.
 */
export class AddDisputeBondTransactionTypes1776086000000 implements MigrationInterface {
  name = "AddDisputeBondTransactionTypes1776086000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE … ADD VALUE is safe and idempotent with IF NOT EXISTS
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum"
        ADD VALUE IF NOT EXISTS 'dispute_bond_lock'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum"
        ADD VALUE IF NOT EXISTS 'dispute_bond_forfeit'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum"
        ADD VALUE IF NOT EXISTS 'dispute_bond_reward'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating the type.
    // Recreate the enum without the three bond values (only safe if no rows use them).
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "transactions"
          ALTER COLUMN "type" TYPE varchar
          USING type::text;
      END $$;
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."transactions_type_enum"`,
    );
    await queryRunner.query(`
      CREATE TYPE "public"."transactions_type_enum" AS ENUM (
        'deposit', 'withdrawal', 'bet_placed', 'bet_payout', 'refund',
        'dispute_bond', 'dispute_refund',
        'referral_bonus', 'free_credit', 'streak_bonus', 'referral_prize',
        'duel_wager', 'duel_payout'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ALTER COLUMN "type" TYPE "public"."transactions_type_enum"
        USING type::"public"."transactions_type_enum"
    `);
  }
}
