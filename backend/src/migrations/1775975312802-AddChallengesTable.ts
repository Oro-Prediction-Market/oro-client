import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChallengesTable1775975312802 implements MigrationInterface {
    name = 'AddChallengesTable1775975312802'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Challenges table (new in this migration) ──────────────────────────
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."challenges_status_enum" AS ENUM('open', 'active', 'settled', 'expired');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "creatorId" uuid NOT NULL, "marketId" uuid NOT NULL, "outcomeId" uuid NOT NULL, "status" "public"."challenges_status_enum" NOT NULL DEFAULT 'open', "participantCount" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e664e93171e20fe4d6125466af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_1980733727a12aad16f53de8ba" ON "challenges" ("creatorId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9f256ed73736fd576726a9b42d" ON "challenges" ("marketId", "status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e32b137e223c851193abf6bc7b" ON "challenges" ("creatorId", "status") `);

        // ── payment_otps column type changes (TIMESTAMP WITH TIME ZONE → TIMESTAMP) ──
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN IF EXISTS "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN IF EXISTS "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);

        // ── audit_logs: role_type_enum → varchar, createdAt timezone strip ────
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_name='audit_logs' AND column_name='roleType'
                           AND udt_name='role_type_enum') THEN
                    ALTER TABLE "audit_logs" DROP COLUMN "roleType";
                    DROP TYPE IF EXISTS "public"."role_type_enum";
                    ALTER TABLE "audit_logs" ADD "roleType" character varying NOT NULL DEFAULT 'admin';
                END IF;
            END $$
        `);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);

        // ── payment_otps indexes ───────────────────────────────────────────────
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_afcac02f3aaf4923b99b11970e" ON "payment_otps" ("paymentId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_aa48db7b32c4f04a68fbe20119" ON "payment_otps" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f0f834f89f781962d41245f56e" ON "payment_otps" ("marketId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f580c073d993620f1aa90cf2e8" ON "payment_otps" ("disputeId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9d53d8c4d4227c02e4476129d2" ON "audit_logs" ("adminId") `);

        // ── payment_otps FKs (idempotent) ─────────────────────────────────────
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_afcac02f3aaf4923b99b11970e7') THEN
                    ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_afcac02f3aaf4923b99b11970e7" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_aa48db7b32c4f04a68fbe201196') THEN
                    ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_aa48db7b32c4f04a68fbe201196" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_f0f834f89f781962d41245f56e1') THEN
                    ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_f0f834f89f781962d41245f56e1" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_f580c073d993620f1aa90cf2e82') THEN
                    ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_f580c073d993620f1aa90cf2e82" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF;
            END $$
        `);

        // ── challenges FKs ────────────────────────────────────────────────────
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_1980733727a12aad16f53de8baf') THEN
                    ALTER TABLE "challenges" ADD CONSTRAINT "FK_1980733727a12aad16f53de8baf" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_2e118d233e9fd497f473c627f06') THEN
                    ALTER TABLE "challenges" ADD CONSTRAINT "FK_2e118d233e9fd497f473c627f06" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_f2a1952cd8e95e35e5da91c4ec9') THEN
                    ALTER TABLE "challenges" ADD CONSTRAINT "FK_f2a1952cd8e95e35e5da91c4ec9" FOREIGN KEY ("outcomeId") REFERENCES "outcomes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_f2a1952cd8e95e35e5da91c4ec9"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_2e118d233e9fd497f473c627f06"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_1980733727a12aad16f53de8baf"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP CONSTRAINT "FK_f580c073d993620f1aa90cf2e82"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP CONSTRAINT "FK_f0f834f89f781962d41245f56e1"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP CONSTRAINT "FK_aa48db7b32c4f04a68fbe201196"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP CONSTRAINT "FK_afcac02f3aaf4923b99b11970e7"`);
        await queryRunner.query(`ALTER TABLE "disputes" DROP CONSTRAINT "FK_4074d1c69ba6b998dcbe6be98e3"`);
        await queryRunner.query(`ALTER TABLE "disputes" DROP CONSTRAINT "FK_f49c7610167b5a0754f72ab5e34"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_88182c148db063015346795a5ed"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_ba6a0153ab467b9ec02765d48f0"`);
        await queryRunner.query(`ALTER TABLE "positions" DROP CONSTRAINT "FK_0cf2caecfba00a6746ec1ff87a3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9d53d8c4d4227c02e4476129d2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f580c073d993620f1aa90cf2e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0f834f89f781962d41245f56e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa48db7b32c4f04a68fbe20119"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_afcac02f3aaf4923b99b11970e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1eb2bfb05045660f5c28635641"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26d3ddc08f3ca2799c6b5ac4d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_721af04ac41f7598ecb59f5e66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c766089a2073274555d9c7483"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_933827dc83a6e08eb13e4dc8ce"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "roleType"`);
        await queryRunner.query(`CREATE TYPE "public"."role_type_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "roleType" "public"."role_type_enum" NOT NULL DEFAULT 'admin'`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_otps" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "reputationTier" SET DEFAULT 'newcomer'`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_1eb2bfb05045660f5c286356413"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "paymentId"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "paymentId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_721af04ac41f7598ecb59f5e66" ON "transactions" ("paymentId") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum_old" AS ENUM('deposit', 'withdrawal', 'bet_placed', 'bet_payout', 'refund', 'dispute_bond', 'dispute_refund', 'referral_bonus')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transactions_type_enum_old" USING "type"::"text"::"public"."transactions_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_type_enum_old" RENAME TO "transactions_type_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "confirmedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "confirmedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE TYPE "public"."payments_type_enum_old" AS ENUM('deposit', 'withdrawal', 'bet_placed', 'bet_payout', 'refund')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "type" TYPE "public"."payments_type_enum_old" USING "type"::"text"::"public"."payments_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."payments_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_type_enum_old" RENAME TO "payments_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."bets_status_enum_old" AS ENUM('pending', 'won', 'lost', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "status" TYPE "public"."bets_status_enum_old" USING "status"::"text"::"public"."bets_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "positions" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."positions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."bets_status_enum_old" RENAME TO "bets_status_enum"`);
        await queryRunner.query(`ALTER TABLE "markets" DROP COLUMN "proposedOutcomeId"`);
        await queryRunner.query(`ALTER TABLE "markets" ADD "proposedOutcomeId" character varying`);
        await queryRunner.query(`ALTER TABLE "markets" DROP COLUMN "resolvedOutcomeId"`);
        await queryRunner.query(`ALTER TABLE "markets" ADD "resolvedOutcomeId" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."markets_mechanism_enum_old" AS ENUM('parimutuel', 'scpm')`);
        await queryRunner.query(`ALTER TABLE "markets" ALTER COLUMN "mechanism" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "markets" ALTER COLUMN "mechanism" TYPE "public"."markets_mechanism_enum_old" USING "mechanism"::"text"::"public"."markets_mechanism_enum_old"`);
        await queryRunner.query(`ALTER TABLE "markets" ALTER COLUMN "mechanism" SET DEFAULT 'parimutuel'`);
        await queryRunner.query(`DROP TYPE "public"."markets_mechanism_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."markets_mechanism_enum_old" RENAME TO "markets_mechanism_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bonusBalance"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "freeCreditGranted"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "isBonus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e32b137e223c851193abf6bc7b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f256ed73736fd576726a9b42d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1980733727a12aad16f53de8ba"`);
        await queryRunner.query(`DROP TABLE "challenges"`);
        await queryRunner.query(`DROP TYPE "public"."challenges_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_logs_adminId" ON "audit_logs" ("adminId") `);
        await queryRunner.query(`CREATE INDEX "IDX_payment_otps_disputeId" ON "payment_otps" ("disputeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_payment_otps_marketId" ON "payment_otps" ("marketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_payment_otps_userId" ON "payment_otps" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_payment_otps_paymentId" ON "payment_otps" ("paymentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dk_gateway_auth_tokens_expiresat" ON "dk_gateway_auth_tokens" ("expiresat") `);
        await queryRunner.query(`CREATE INDEX "IDX_dk_gateway_auth_tokens_accesstoken" ON "dk_gateway_auth_tokens" ("accesstoken") `);
        await queryRunner.query(`CREATE INDEX "IDX_disputes_userId" ON "disputes" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_disputes_marketId" ON "disputes" ("marketId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_telegramChatId" ON "users" ("telegramChatId") WHERE ("telegramChatId" IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_dkAccountNumber" ON "users" ("dkAccountNumber") WHERE ("dkAccountNumber" IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_dkCid" ON "users" ("dkCid") WHERE ("dkCid" IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_username" ON "users" ("username") WHERE (username IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_telegramId" ON "users" ("telegramId") WHERE ("telegramId" IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_telegramChatId" ON "users" ("telegramChatId") WHERE ("telegramChatId" IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_paymentId" ON "transactions" ("paymentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_transactions_positionId" ON "transactions" ("positionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2756723e1cddcdb37f3a37ebb4" ON "transactions" ("positionId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payments_externalPaymentId" ON "payments" ("externalPaymentId") WHERE ("externalPaymentId" IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_positions_userId_marketId" ON "positions" ("userId", "marketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2e520de4bcc291a7fd215f1dd" ON "positions" ("userId", "marketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_markets_status" ON "markets" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_outcomes_marketId" ON "outcomes" ("marketId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_auth_methods_provider_providerId" ON "auth_methods" ("provider", "providerId") `);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_payment_otps_dispute" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_payment_otps_market" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_payment_otps_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_otps" ADD CONSTRAINT "FK_payment_otps_payment" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_marketId" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disputes" ADD CONSTRAINT "FK_disputes_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_positionId" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_cc3b868c15ba2f88702f9a2866e" FOREIGN KEY ("outcomeId") REFERENCES "outcomes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_a3c43ce1fc761d6d0a4b206449c" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "positions" ADD CONSTRAINT "FK_ca8cf669d26fbfcc365a4811b22" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
