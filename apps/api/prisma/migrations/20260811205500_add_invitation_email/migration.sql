ALTER TABLE `invitations`
  ADD COLUMN `email` VARCHAR(320) NULL AFTER `tokenHash`;

-- Les anciennes invitations n'avaient pas de destinataire fiable. On les invalide
-- pendant la migration plutôt que de permettre leur utilisation avec un email libre.
UPDATE `invitations`
SET
  `email` = CONCAT('legacy-', `id`, '@invalid.local'),
  `usedAt` = COALESCE(`usedAt`, CURRENT_TIMESTAMP)
WHERE `email` IS NULL;

ALTER TABLE `invitations`
  MODIFY COLUMN `email` VARCHAR(320) NOT NULL;

CREATE INDEX `invitations_email_idx` ON `invitations`(`email`);
