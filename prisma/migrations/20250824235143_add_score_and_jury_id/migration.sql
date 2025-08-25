-- AlterTable
ALTER TABLE "public"."QuestionResponse" ADD COLUMN     "score" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."ResponseSession" ADD COLUMN     "juryId" INTEGER;

-- CreateIndex
CREATE INDEX "ResponseSession_juryId_idx" ON "public"."ResponseSession"("juryId");
