-- CreateTable
CREATE TABLE "public"."StatusProgress" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "previousStatus" TEXT,
    "changedBy" INTEGER,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" SERIAL NOT NULL,
    "questionText" TEXT NOT NULL,
    "description" TEXT,
    "inputType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "minValue" DECIMAL(65,30),
    "maxValue" DECIMAL(65,30),
    "scoreType" TEXT NOT NULL DEFAULT 'number',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Group" (
    "id" SERIAL NOT NULL,
    "groupName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupQuestion" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "orderNumber" INTEGER NOT NULL,
    "sectionTitle" TEXT,
    "subsection" TEXT,
    "isGrouped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TahapGroupHierarchy" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "tahapGroup" TEXT NOT NULL,
    "groupIdentifier" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "description" TEXT,
    "parentGroupId" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TahapGroupHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionTahapGroup" (
    "id" SERIAL NOT NULL,
    "groupQuestionId" INTEGER NOT NULL,
    "tahapGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionTahapGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResponseSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "currentQuestionId" INTEGER,
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "autoSaveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAutoSaveAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,
    "reviewerId" INTEGER,
    "stage" TEXT,
    "decision" TEXT,
    "overallComments" TEXT,
    "totalScore" DECIMAL(65,30),
    "deliberationNotes" TEXT,
    "internalNotes" TEXT,
    "validationChecklist" JSONB,

    CONSTRAINT "ResponseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionResponse" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "groupQuestionId" INTEGER NOT NULL,
    "textValue" TEXT,
    "numericValue" DECIMAL(65,30),
    "booleanValue" BOOLEAN,
    "arrayValue" JSONB,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "autoSaveVersion" INTEGER NOT NULL DEFAULT 1,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,
    "firstAnsweredAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "validationErrors" JSONB,
    "metadata" JSONB,

    CONSTRAINT "QuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewComment" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" INTEGER,
    "revisionNotes" TEXT,

    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JuryScore" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestionOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "optionText" TEXT NOT NULL,
    "optionValue" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "isMultipleChoice" BOOLEAN NOT NULL DEFAULT false,
    "isCheckBox" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoryGroup" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusProgress_sessionId_idx" ON "public"."StatusProgress"("sessionId");

-- CreateIndex
CREATE INDEX "StatusProgress_changedAt_idx" ON "public"."StatusProgress"("changedAt");

-- CreateIndex
CREATE INDEX "StatusProgress_status_idx" ON "public"."StatusProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "public"."UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_userId_groupId_key" ON "public"."UserGroup"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_name_key" ON "public"."QuestionCategory"("name");

-- CreateIndex
CREATE INDEX "QuestionCategory_deletedAt_idx" ON "public"."QuestionCategory"("deletedAt");

-- CreateIndex
CREATE INDEX "QuestionCategory_scoreType_idx" ON "public"."QuestionCategory"("scoreType");

-- CreateIndex
CREATE INDEX "GroupQuestion_groupId_idx" ON "public"."GroupQuestion"("groupId");

-- CreateIndex
CREATE INDEX "GroupQuestion_questionId_idx" ON "public"."GroupQuestion"("questionId");

-- CreateIndex
CREATE INDEX "GroupQuestion_categoryId_idx" ON "public"."GroupQuestion"("categoryId");

-- CreateIndex
CREATE INDEX "TahapGroupHierarchy_groupId_level_idx" ON "public"."TahapGroupHierarchy"("groupId", "level");

-- CreateIndex
CREATE INDEX "TahapGroupHierarchy_parentGroupId_idx" ON "public"."TahapGroupHierarchy"("parentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "TahapGroupHierarchy_groupId_tahapGroup_groupIdentifier_key" ON "public"."TahapGroupHierarchy"("groupId", "tahapGroup", "groupIdentifier");

-- CreateIndex
CREATE INDEX "QuestionTahapGroup_groupQuestionId_idx" ON "public"."QuestionTahapGroup"("groupQuestionId");

-- CreateIndex
CREATE INDEX "QuestionTahapGroup_tahapGroupId_idx" ON "public"."QuestionTahapGroup"("tahapGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionTahapGroup_groupQuestionId_tahapGroupId_key" ON "public"."QuestionTahapGroup"("groupQuestionId", "tahapGroupId");

-- CreateIndex
CREATE INDEX "ResponseSession_userId_idx" ON "public"."ResponseSession"("userId");

-- CreateIndex
CREATE INDEX "ResponseSession_lastActivityAt_idx" ON "public"."ResponseSession"("lastActivityAt");

-- CreateIndex
CREATE INDEX "ResponseSession_reviewerId_idx" ON "public"."ResponseSession"("reviewerId");

-- CreateIndex
CREATE INDEX "ResponseSession_stage_idx" ON "public"."ResponseSession"("stage");

-- CreateIndex
CREATE INDEX "ResponseSession_reviewedAt_idx" ON "public"."ResponseSession"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseSession_userId_groupId_key" ON "public"."ResponseSession"("userId", "groupId");

-- CreateIndex
CREATE INDEX "QuestionResponse_sessionId_isDraft_idx" ON "public"."QuestionResponse"("sessionId", "isDraft");

-- CreateIndex
CREATE INDEX "QuestionResponse_lastModifiedAt_idx" ON "public"."QuestionResponse"("lastModifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionResponse_sessionId_questionId_key" ON "public"."QuestionResponse"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "ReviewComment_sessionId_idx" ON "public"."ReviewComment"("sessionId");

-- CreateIndex
CREATE INDEX "ReviewComment_questionId_idx" ON "public"."ReviewComment"("questionId");

-- CreateIndex
CREATE INDEX "ReviewComment_stage_idx" ON "public"."ReviewComment"("stage");

-- CreateIndex
CREATE INDEX "ReviewComment_isResolved_idx" ON "public"."ReviewComment"("isResolved");

-- CreateIndex
CREATE INDEX "JuryScore_sessionId_idx" ON "public"."JuryScore"("sessionId");

-- CreateIndex
CREATE INDEX "JuryScore_questionId_idx" ON "public"."JuryScore"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "JuryScore_sessionId_questionId_key" ON "public"."JuryScore"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "public"."QuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "QuestionOption_orderNumber_idx" ON "public"."QuestionOption"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "public"."Category"("deletedAt");

-- CreateIndex
CREATE INDEX "CategoryGroup_categoryId_idx" ON "public"."CategoryGroup"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryGroup_groupId_idx" ON "public"."CategoryGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGroup_categoryId_groupId_key" ON "public"."CategoryGroup"("categoryId", "groupId");

-- AddForeignKey
ALTER TABLE "public"."StatusProgress" ADD CONSTRAINT "StatusProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StatusProgress" ADD CONSTRAINT "StatusProgress_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionCategory" ADD CONSTRAINT "QuestionCategory_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupQuestion" ADD CONSTRAINT "GroupQuestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupQuestion" ADD CONSTRAINT "GroupQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupQuestion" ADD CONSTRAINT "GroupQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."QuestionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TahapGroupHierarchy" ADD CONSTRAINT "TahapGroupHierarchy_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TahapGroupHierarchy" ADD CONSTRAINT "TahapGroupHierarchy_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "public"."TahapGroupHierarchy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionTahapGroup" ADD CONSTRAINT "QuestionTahapGroup_groupQuestionId_fkey" FOREIGN KEY ("groupQuestionId") REFERENCES "public"."GroupQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionTahapGroup" ADD CONSTRAINT "QuestionTahapGroup_tahapGroupId_fkey" FOREIGN KEY ("tahapGroupId") REFERENCES "public"."TahapGroupHierarchy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResponseSession" ADD CONSTRAINT "ResponseSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResponseSession" ADD CONSTRAINT "ResponseSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResponseSession" ADD CONSTRAINT "ResponseSession_currentQuestionId_fkey" FOREIGN KEY ("currentQuestionId") REFERENCES "public"."Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResponseSession" ADD CONSTRAINT "ResponseSession_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResponseSession" ADD CONSTRAINT "ResponseSession_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionResponse" ADD CONSTRAINT "QuestionResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionResponse" ADD CONSTRAINT "QuestionResponse_groupQuestionId_fkey" FOREIGN KEY ("groupQuestionId") REFERENCES "public"."GroupQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewComment" ADD CONSTRAINT "ReviewComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewComment" ADD CONSTRAINT "ReviewComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewComment" ADD CONSTRAINT "ReviewComment_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JuryScore" ADD CONSTRAINT "JuryScore_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ResponseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JuryScore" ADD CONSTRAINT "JuryScore_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryGroup" ADD CONSTRAINT "CategoryGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryGroup" ADD CONSTRAINT "CategoryGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
