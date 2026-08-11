ALTER TABLE `invitations`
  ADD COLUMN `email` VARCHAR(320) NOT NULL AFTER `tokenHash`;

CREATE INDEX `invitations_email_idx` ON `invitations`(`email`);
