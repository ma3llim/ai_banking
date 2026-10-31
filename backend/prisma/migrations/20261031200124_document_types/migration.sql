-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GENERAL', 'STATEMENT');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "analyzed_at" TIMESTAMP(3),
ADD COLUMN     "content" TEXT,
ADD COLUMN     "doc_type" "DocumentType" NOT NULL DEFAULT 'GENERAL';
