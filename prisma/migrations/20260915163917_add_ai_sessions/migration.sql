-- CreateEnum
CREATE TYPE "AiSessionPhase" AS ENUM ('CLARIFYING', 'PLANNED', 'GENERATING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AiMessageKind" AS ENUM ('TEXT', 'QUESTIONS', 'ANSWERS', 'PLAN', 'RESULT', 'ERROR');

-- CreateEnum
CREATE TYPE "AiMessageStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" "AiSessionPhase" NOT NULL DEFAULT 'CLARIFYING',
    "brief" JSONB,
    "clarifyRounds" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "kind" "AiMessageKind" NOT NULL,
    "content" TEXT NOT NULL,
    "payload" JSONB,
    "runId" TEXT,
    "status" "AiMessageStatus" NOT NULL DEFAULT 'COMPLETE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSession_projectId_userId_lastActivityAt_idx" ON "AiSession"("projectId", "userId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "AiSession_expiresAt_idx" ON "AiSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiMessage_runId_key" ON "AiMessage"("runId");

-- CreateIndex
CREATE INDEX "AiMessage_sessionId_createdAt_idx" ON "AiMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
