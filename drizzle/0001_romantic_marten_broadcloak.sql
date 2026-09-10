CREATE TABLE `farmerListings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmerKey` varchar(128) NOT NULL DEFAULT 'demo-farmer-krishna',
	`crop` varchar(64) NOT NULL,
	`quantityKg` int NOT NULL,
	`location` varchar(255) NOT NULL,
	`city` varchar(128) NOT NULL,
	`district` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`minimumPricePerKg` int NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farmerListings_id` PRIMARY KEY(`id`)
);
