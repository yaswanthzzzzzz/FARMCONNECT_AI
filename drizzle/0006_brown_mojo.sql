CREATE TABLE `passwordCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usernameNormalized` varchar(64) NOT NULL,
	`usernameDisplay` varchar(64) NOT NULL,
	`passwordHash` text NOT NULL,
	`passwordVersion` varchar(32) NOT NULL DEFAULT 'argon2id-v1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastPasswordLoginAt` timestamp,
	`disabledAt` timestamp,
	CONSTRAINT `passwordCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordCredentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `passwordCredentials_usernameNormalized_unique` UNIQUE(`usernameNormalized`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `identityKey` varchar(128);--> statement-breakpoint
UPDATE `users` SET `identityKey` = `openId` WHERE `identityKey` IS NULL AND `openId` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `identityKey` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_identityKey_unique` UNIQUE(`identityKey`);--> statement-breakpoint
ALTER TABLE `passwordCredentials` ADD CONSTRAINT `passwordCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
