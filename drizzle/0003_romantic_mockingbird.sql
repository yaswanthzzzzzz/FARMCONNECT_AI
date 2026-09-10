CREATE TABLE `aggregationPlanContributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`farmerListingId` int NOT NULL,
	`farmerKey` varchar(128) NOT NULL,
	`contributedQuantityKg` int NOT NULL,
	`minimumPricePerKg` int NOT NULL,
	`distanceKm` int NOT NULL,
	`estimatedTransportCost` int NOT NULL,
	`contributionOutcome` int NOT NULL,
	`sequence` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aggregationPlanContributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aggregationPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requirementId` int NOT NULL,
	`buyerKey` varchar(128) NOT NULL,
	`status` enum('proposed','selected','expired','cancelled') NOT NULL DEFAULT 'proposed',
	`fulfilmentType` enum('full','partial') NOT NULL,
	`requiredQuantityKg` int NOT NULL,
	`plannedQuantityKg` int NOT NULL,
	`remainingQuantityKg` int NOT NULL,
	`offeredPricePerKg` int NOT NULL,
	`grossRevenue` int NOT NULL,
	`transportCost` int NOT NULL,
	`estimatedNetOutcome` int NOT NULL,
	`totalDistanceKm` int NOT NULL,
	`distanceMethod` varchar(64) NOT NULL,
	`logisticsSnapshot` text NOT NULL,
	`marketReferenceSnapshot` text,
	`algorithmVersion` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `aggregationPlans_id` PRIMARY KEY(`id`)
);
