-- CreateTable
CREATE TABLE "user_google_calendars" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_calendar_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "background_color" TEXT,
    "foreground_color" TEXT,
    "access_role" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "sync_token" TEXT,
    "channel_id" TEXT,
    "channel_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_google_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_google_calendars_user_id_google_calendar_id_key" ON "user_google_calendars"("user_id", "google_calendar_id");

-- AddForeignKey
ALTER TABLE "user_google_calendars" ADD CONSTRAINT "user_google_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
