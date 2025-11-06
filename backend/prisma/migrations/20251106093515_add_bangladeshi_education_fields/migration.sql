-- AlterTable
ALTER TABLE "users" ADD COLUMN     "board" TEXT,
ADD COLUMN     "class" TEXT,
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "expectedGraduation" TIMESTAMP(3),
ADD COLUMN     "group" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "major" TEXT,
ADD COLUMN     "year" INTEGER;
