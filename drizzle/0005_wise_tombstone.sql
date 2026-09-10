ALTER TABLE `buyerRequirements` ADD `latitude` double;--> statement-breakpoint
ALTER TABLE `buyerRequirements` ADD `longitude` double;--> statement-breakpoint
ALTER TABLE `buyerRequirements` ADD `locationSource` varchar(16) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `farmerListings` ADD `latitude` double;--> statement-breakpoint
ALTER TABLE `farmerListings` ADD `longitude` double;--> statement-breakpoint
ALTER TABLE `farmerListings` ADD `locationSource` varchar(16) DEFAULT 'manual' NOT NULL;