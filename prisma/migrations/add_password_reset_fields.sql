-- Add password reset fields to User table
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" TIMESTAMP;

-- Create index on resetToken for faster lookups
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");
