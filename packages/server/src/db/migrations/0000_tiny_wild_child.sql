CREATE TABLE `audit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`action_type` text NOT NULL,
	`target` text,
	`value` text,
	`reasoning` text,
	`screenshot_path` text,
	`url` text,
	`dom_snapshot_hash` text,
	`success` integer,
	`error_message` text,
	`duration_ms` integer,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`solari_profile_id` text,
	`description` text,
	`session_count` integer DEFAULT 0,
	`last_used_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`solari_session_id` text NOT NULL,
	`replay_url` text,
	`local_path` text,
	`size_bytes` integer,
	`event_count` integer,
	`duration_ms` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`processed_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`solari_session_id` text,
	`solari_environment` text DEFAULT 'browser',
	`total_steps` integer DEFAULT 0,
	`current_url` text,
	`duration_ms` integer,
	`result` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`profile_id` text,
	`proxy_country` text DEFAULT 'us',
	`stealth_enabled` integer DEFAULT true,
	`captcha_enabled` integer DEFAULT true,
	`recording_enabled` integer DEFAULT true,
	`max_steps` integer DEFAULT 50,
	`timeout_ms` integer DEFAULT 300000,
	`result` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
