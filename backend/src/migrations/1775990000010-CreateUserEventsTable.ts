import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserEventsTable1775990000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_events" (
        "id"          UUID DEFAULT gen_random_uuid() NOT NULL,
        "userId"      UUID NOT NULL,
        "sessionId"   VARCHAR,
        "eventType"   VARCHAR NOT NULL,
        "platform"    VARCHAR,
        "meta"        JSONB,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_user_events_userId_createdAt" ON "user_events" ("userId", "createdAt")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_events_eventType_createdAt" ON "user_events" ("eventType", "createdAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_events"`);
  }
}
