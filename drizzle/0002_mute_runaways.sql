CREATE TABLE `buyerRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerKey` varchar(128) NOT NULL DEFAULT 'demo-buyer-sahyadri',
	`crop` varchar(64) NOT NULL,
	`requiredQuantityKg` int NOT NULL,
	`location` varchar(255) NOT NULL,
	`city` varchar(128) NOT NULL,
	`district` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`offeredPricePerKg` int NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyerRequirements_id` PRIMARY KEY(`id`)
);
