import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add duel_wager and duel_payout to the transactions_type_enum.
 * These are used by ChallengesService so duel money movements appear
 * as their own distinct rows in the wallet history instead of being
 * conflated with bet_placed / bet_payout.
 */
export class AddDuelTransactionTypes1776075295300 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum"
        ADD VALUE IF NOT EXISTS 'duel_wager';
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum"
        ADD VALUE IF NOT EXISTS 'duel_payout';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // Recreate the enum without the new values and migrate existing rows back.
    await queryRunner.query(`
      UPDATE transactions
        SET type = 'bet_placed'
      WHERE type = 'duel_wager';
    `);
    await queryRunner.query(`
      UPDATE transactions
        SET type = 'bet_payout'
      WHERE type = 'duel_payout';
    `);
    await queryRunner.query(`
      ALTER TABLE transactions
        ALTER COLUMN type TYPE VARCHAR;
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_type_enum_new"`);
    await queryRunner.query(`
      CREATE TYPE "public"."transactions_type_enum_new" AS ENUM(
        'deposit','withdrawal','bet_placed','bet_payout','refund',
        'dispute_bond','dispute_refund','referral_bonus',
        'free_credit','streak_bonus','referral_prize'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE transactions
        ALTER COLUMN type TYPE "public"."transactions_type_enum_new"
        USING type::"public"."transactions_type_enum_new";
    `);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(`
      ALTER TYPE "public"."transactions_type_enum_new"
        RENAME TO "transactions_type_enum";
    `);
  }
}
