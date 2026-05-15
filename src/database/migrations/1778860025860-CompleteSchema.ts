import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteSchema1778860025860 implements MigrationInterface {
    name = 'CompleteSchema1778860025860'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'librarian', 'member')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'member', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."loans_status_enum" AS ENUM('active', 'returned', 'overdue', 'lost')`);
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "loanedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL, "returnedAt" TIMESTAMP WITH TIME ZONE, "status" "public"."loans_status_enum" NOT NULL DEFAULT 'active', "fineAmount" numeric(10,2) NOT NULL DEFAULT '0', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "itemId" uuid, CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fc93811078d7fd7a36d773175a" ON "loans" ("userId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_0840bf4a3052204ad0097cea97" ON "loans" ("itemId", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."items_type_enum" AS ENUM('book', 'magazine', 'equipment')`);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "code" character varying(32) NOT NULL, "type" "public"."items_type_enum" NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1b0a705ce0dc5430c020a0ec31f" UNIQUE ("code"), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b0a705ce0dc5430c020a0ec31" ON "items" ("code") `);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_4c2ab4e556520045a2285916d45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_44191d25fbfcb4f760233f25715" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_44191d25fbfcb4f760233f25715"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_4c2ab4e556520045a2285916d45"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b0a705ce0dc5430c020a0ec31"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP TYPE "public"."items_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0840bf4a3052204ad0097cea97"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc93811078d7fd7a36d773175a"`);
        await queryRunner.query(`DROP TABLE "loans"`);
        await queryRunner.query(`DROP TYPE "public"."loans_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
