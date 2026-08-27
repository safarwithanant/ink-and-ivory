CREATE TABLE `shipping_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(64) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`line1` varchar(255) NOT NULL,
	`line2` varchar(255),
	`city` varchar(120) NOT NULL,
	`state` varchar(120) NOT NULL,
	`postalCode` varchar(24) NOT NULL,
	`country` varchar(2) NOT NULL DEFAULT 'IN',
	`phone` varchar(32),
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
CREATE INDEX `shipping_addresses_user_idx` ON `shipping_addresses` (`userId`);