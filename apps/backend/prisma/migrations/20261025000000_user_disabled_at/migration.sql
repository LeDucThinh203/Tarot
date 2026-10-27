-- Add disabledAt column to support account suspension by admin.
ALTER TABLE "User" ADD COLUMN "disabledAt" DATETIME;
