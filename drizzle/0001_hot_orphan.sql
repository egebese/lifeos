ALTER TABLE "exercises" ADD COLUMN "instruction_steps_en" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "instruction_steps_tr" jsonb DEFAULT '[]'::jsonb;