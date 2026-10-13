CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_url" text NOT NULL,
	"short_code" varchar(32) NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_access_count_non_negative" CHECK ("links"."access_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "links_short_code_lower_unique" ON "links" USING btree (lower("short_code"));--> statement-breakpoint
CREATE INDEX "links_created_at_id_idx" ON "links" USING btree ("created_at","id");