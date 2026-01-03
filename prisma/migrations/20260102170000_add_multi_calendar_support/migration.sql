-- Add multi-calendar support: allow selecting multiple calendars

-- Add new columns
ALTER TABLE "GoogleCalendarSettings" ADD COLUMN "calendarIds" TEXT[] DEFAULT ARRAY['primary']::TEXT[];
ALTER TABLE "GoogleCalendarSettings" ADD COLUMN "availableCalendars" JSONB;

-- Migrate existing calendarId data to calendarIds array
UPDATE "GoogleCalendarSettings"
SET "calendarIds" = ARRAY["calendarId"]::TEXT[]
WHERE "calendarId" IS NOT NULL;

-- Drop the old column
ALTER TABLE "GoogleCalendarSettings" DROP COLUMN "calendarId";
