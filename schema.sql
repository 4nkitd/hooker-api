DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests` (
  `id` bigint(20) NOT NULL,
  `uuid` int(11) NOT NULL,
  `body` text NOT NULL,
  `headers` text NOT NULL,
  `ip` tinytext NOT NULL,
  `method` int(11) NOT NULL,
  `is_cron` tinyint(4) NOT NULL,
  `updated_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
);


DROP TABLE IF EXISTS `webhooks`;
CREATE TABLE `webhooks` (
  `id` int(11) NOT NULL,
  `uuid` tinytext NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `active` tinyint(4) DEFAULT 1 NOT NULL,
  `total_req_count` int(11) DEFAULT 0 NOT NULL,
  `is_redirect` tinyint(4) DEFAULT 0 NOT NULL,
  `custom_js` text  NULL,
  `salt` text NULL,
  `updated_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ,
  PRIMARY KEY (`id`)
) ;
