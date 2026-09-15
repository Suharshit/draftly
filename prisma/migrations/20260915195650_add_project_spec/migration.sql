-- CreateEnum
CREATE TYPE "TaskRunKind" AS ENUM ('DESIGN', 'SPEC');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "specGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "specMdPath" TEXT,
ADD COLUMN     "specRunId" TEXT,
ADD COLUMN     "specStats" JSONB;

-- AlterTable
ALTER TABLE "TaskRun" ADD COLUMN     "kind" "TaskRunKind" NOT NULL DEFAULT 'DESIGN';

-- CreateIndex
CREATE INDEX "TaskRun_projectId_kind_createdAt_idx" ON "TaskRun"("projectId", "kind", "createdAt");
