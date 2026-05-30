-- AlterTable
ALTER TABLE `request` ADD COLUMN `voiceDurationMs` INTEGER NULL,
    ADD COLUMN `voiceNoteUrl` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `subscriptionrequest` ADD COLUMN `customBranchesLimit` INTEGER NULL,
    ADD COLUMN `customClientsLimit` INTEGER NULL,
    ADD COLUMN `customEmployeesLimit` INTEGER NULL,
    ADD COLUMN `decidedAt` DATETIME(3) NULL,
    ADD COLUMN `decidedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `ownerMessage` TEXT NULL,
    ADD COLUMN `rejectReason` TEXT NULL;

-- CreateIndex
CREATE INDEX `SubscriptionRequest_companyId_status_idx` ON `SubscriptionRequest`(`companyId`, `status`);
