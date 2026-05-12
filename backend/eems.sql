-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 12, 2026 at 05:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `eems`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `role` enum('Super Admin','EEMS Admin','EAMS Admin') NOT NULL,
  `password` varchar(255) NOT NULL,
  `reset_code` varchar(50) DEFAULT NULL,
  `code_expiry` datetime DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(20) DEFAULT 'active',
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`admin_id`, `email`, `fullname`, `role`, `password`, `reset_code`, `code_expiry`, `created`, `status`, `archived_at`) VALUES
(2300295, 'cassyrain03@gmail.com', 'Bianca Rain Castillon', 'Super Admin', '$2b$10$7nVNYypnlfwEyycnMSBHAe7OvSGTShED3w0W63C3pt9iZwEZZ4f3C', NULL, NULL, '2026-02-26 07:19:51', 'active', NULL),
(2300296, 'bitancor_jeremiah@plpasig.edu.ph', 'BITANCOR, JERIMIAH AMORA', 'EEMS Admin', '$2b$10$TIi4q7O/EWLRyQAOI9Q7wuhVAPw4avAP.RukxEfKa8dUxqfqfk/Cu', '163510', '2026-03-17 13:25:14', '2026-03-17 13:09:04', 'active', NULL),
(2300297, 'flavierlaurence01@gmail.com', 'FLAVIER, LAURENCE JAMES LETANA II', 'EAMS Admin', '$2b$10$CJmgnd1RJT7VFJQDVIxXteQ1vPwfSMQJ2QnBxVb6jlTE9YFqwZ3d6', NULL, NULL, '2026-04-22 07:45:14', 'active', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `authentication`
--

CREATE TABLE `authentication` (
  `auth_id` bigint(20) NOT NULL,
  `student_id` varchar(20) DEFAULT NULL,
  `method` enum('FACIAL','MANUAL','QR') NOT NULL,
  `auth_status` enum('SUCCESS','FAILED') DEFAULT NULL,
  `action` enum('ENTRY','EXIT') DEFAULT NULL,
  `accuracy` decimal(5,2) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `failure_reason` varchar(50) DEFAULT NULL,
  `confidence` decimal(5,2) DEFAULT NULL,
  `processing_time_ms` int(11) DEFAULT NULL,
  `quality_score` decimal(5,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `dept_code` varchar(20) NOT NULL,
  `dept_name` varchar(100) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `dept_code`, `dept_name`, `status`, `created_at`, `updated_at`) VALUES
(1, 'COE', 'College of Engineering', 'Active', '2026-04-13 04:42:32', '2026-04-27 14:16:25'),
(2, 'CCS', 'College of Computer Studies', 'Active', '2026-04-13 04:44:09', '2026-04-27 14:16:25'),
(3, 'CON', 'College of Nursing', 'Active', '2026-04-13 08:07:20', '2026-04-27 14:16:25'),
(4, 'COED', 'College of Education', 'Active', '2026-04-20 09:11:51', '2026-04-27 14:16:25'),
(5, 'CBA', 'College of Business and Accountancy', 'Active', '2026-04-20 09:13:47', '2026-04-27 14:16:25'),
(6, 'CIHM', 'College of International Hospitality Management', 'Active', '2026-04-20 09:26:14', '2026-04-27 14:16:25'),
(7, 'CAS', 'College of Arts and Sciences', 'Active', '2026-04-20 09:26:56', '2026-04-27 14:16:25'),
(15, 'CM', 'miah', 'Inactive', '2026-04-27 10:35:45', '2026-04-27 10:36:23'),
(16, 'COL', 'College of Law', 'Active', '2026-04-28 10:18:37', '2026-04-28 13:27:08');

-- --------------------------------------------------------

--
-- Table structure for table `entry_exit_logs`
--

CREATE TABLE `entry_exit_logs` (
  `log_id` bigint(20) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `auth_id` bigint(20) NOT NULL,
  `action` enum('ENTRY','EXIT') NOT NULL,
  `gate_window_violation` tinyint(1) DEFAULT 0,
  `log_time` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `program_code` varchar(20) NOT NULL,
  `program_name` varchar(200) NOT NULL,
  `program_type` enum('Undergraduate','Graduate') NOT NULL DEFAULT 'Undergraduate',
  `program_status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `duration` int(11) NOT NULL DEFAULT 0,
  `date_created` date NOT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id`, `department_id`, `program_code`, `program_name`, `program_type`, `program_status`, `duration`, `date_created`, `updated_at`) VALUES
(18, 2, 'BSIT', 'Bachelor of Science in Information Technology', 'Undergraduate', 'Active', 4, '2026-04-13', '2026-04-27 15:16:52'),
(19, 2, 'BSCS', 'Bachelor of Science in Computer Science', 'Undergraduate', 'Active', 4, '2026-04-13', '2026-04-27 15:16:52'),
(20, 3, 'BSN', 'Bachelor of Science in Nursing', 'Undergraduate', 'Active', 4, '2026-04-13', '2026-04-27 15:16:52'),
(24, 1, 'BSEE', 'Bachelor of Science in Electronics Engineering', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(25, 4, 'BEED', 'Bachelor of Elementary Education', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(26, 4, 'BSED-FILIPINO', 'Bachelor of Secondary Education Major in Filipino', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(27, 4, 'BSED-ENGLISH', 'Bachelor of Secondary Education Major in English', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(28, 4, 'BSED-SCIENCE', 'Bachelor of Secondary Education Major in Science', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(29, 4, 'BSED-MATHEMATICS', 'Bachelor of Secondary Education Major in Mathematics', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(30, 5, 'BSA', 'Bachelor of Science in Accountancy', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(31, 5, 'BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(33, 5, 'BSE', 'Bachelor of Science in Entrepreneurship', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-29 20:22:37'),
(34, 6, 'BSHM', 'Bachelor of Science in Hospitality Management', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(35, 7, 'AB-PSYCH', 'Bachelor of Arts in Psychology', 'Undergraduate', 'Active', 4, '2026-04-20', '2026-04-27 15:16:52'),
(36, 16, 'BSPA', 'Bacchelor of Science Public Administrator', 'Undergraduate', 'Active', 4, '2026-04-28', '2026-04-29 13:26:43'),
(37, 7, 'try', 'try try ', '', 'Inactive', 4, '2026-04-29', '2026-04-29 13:15:08');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT NULL,
  `extension_name` varchar(11) DEFAULT NULL,
  `program_id` int(11) NOT NULL,
  `year_level` int(11) NOT NULL,
  `status` enum('Regular','Irregular','LOA','Dropout','Kickout','Graduated','Transferred','Inactive') NOT NULL DEFAULT 'Regular',
  `is_archived` tinyint(4) NOT NULL,
  `archived_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_face_embeddings`
--

CREATE TABLE `student_face_embeddings` (
  `id` int(11) NOT NULL,
  `student_id` varchar(20) NOT NULL,
  `face_embedding` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `face_position` varchar(20) DEFAULT NULL,
  `quality` float DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `key` varchar(100) NOT NULL,
  `value` text NOT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`key`, `value`, `updated_at`) VALUES
('block_outside_window', 'true', '2026-04-22 13:10:47'),
('gate_entry_end', '23:59', '2026-05-11 22:16:57'),
('gate_entry_start', '00:00', '2026-05-12 00:04:53'),
('gate_exit_end', '23:59', '2026-05-11 22:16:57'),
('gate_exit_start', '00:00', '2026-05-12 00:04:53'),
('school_year_end', '2026', '2026-04-22 13:10:47'),
('school_year_start', '2025', '2026-04-22 13:10:47'),
('sem1_end', '2025-12-31', '2026-04-22 13:10:47'),
('sem1_start', '2025-08-01', '2026-04-22 13:10:47'),
('sem2_end', '2026-05-23', '2026-05-04 14:55:13'),
('sem2_start', '2026-01-19', '2026-05-04 14:55:13'),
('semester', '1', '2026-04-22 13:10:47');

-- --------------------------------------------------------

--
-- Table structure for table `visitor_logs`
--

CREATE TABLE `visitor_logs` (
  `visitor_id` bigint(20) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `reason` varchar(100) NOT NULL,
  `other_reason` varchar(255) DEFAULT NULL,
  `action` enum('ENTRY','EXIT') NOT NULL DEFAULT 'ENTRY',
  `log_time` datetime NOT NULL DEFAULT current_timestamp(),
  `qr_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `visitor_logs`
--

INSERT INTO `visitor_logs` (`visitor_id`, `full_name`, `email`, `reason`, `other_reason`, `action`, `log_time`, `qr_token`) VALUES
(6, 'Lynn Czyla Alpuerto', 'lynnzylameczdo@gmail.com', 'Meeting with Faculty', NULL, 'EXIT', '2026-04-05 06:46:35', '143439a8-4141-4f15-8894-be9b11f1897d'),
(7, 'Lynn Czyla Alpuerto', 'lynnzylameczdo@gmail.com', 'Meeting with Faculty', NULL, 'EXIT', '2026-04-05 06:58:59', 'a5405905-787f-4f14-b09f-83b02cfa5061'),
(8, 'Lynn Czyla Alpuerto', 'lynnzylameczdo@gmail.com', 'Meeting with Faculty', NULL, 'EXIT', '2026-04-05 07:20:24', 'b06fc5d1-27ed-4252-98d4-9e2d1f0a16f3'),
(9, 'Lynn Czyla ALpuerto', 'bitancor1234amora@gmail.com', 'Event / Activity', NULL, 'ENTRY', '2026-04-06 16:43:58', '95cc9628-2458-4539-bd43-9cda18de7a9e'),
(10, 'Bitancor, jerimiah A', 'bitancor1234amora@gmail.com', 'Enrollment / Registration', NULL, 'EXIT', '2026-04-13 22:40:02', '45095469-9652-42b6-8292-8340fe8bb6dd'),
(11, 'Bitancor, Jerimiah A.', 'bitancor_jeremiah@plpasig.edu.ph', 'Event / Activity', NULL, 'ENTRY', '2026-04-22 16:13:07', 'd841af60-cf74-4cff-b272-e1487421d87b');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `authentication`
--
ALTER TABLE `authentication`
  ADD PRIMARY KEY (`auth_id`),
  ADD KEY `idx_auth_student` (`student_id`),
  ADD KEY `idx_auth_timestamp` (`timestamp`),
  ADD KEY `idx_auth_method` (`method`),
  ADD KEY `idx_action` (`action`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dept_code` (`dept_code`),
  ADD UNIQUE KEY `dept_name` (`dept_name`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dept_name` (`dept_name`);

--
-- Indexes for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `auth_id` (`auth_id`),
  ADD KEY `idx_log_student` (`student_id`),
  ADD KEY `idx_log_time` (`log_time`),
  ADD KEY `idx_student_logtime` (`student_id`,`log_time`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `programCode` (`program_code`),
  ADD KEY `fk_program_department` (`department_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_year_level` (`year_level`),
  ADD KEY `idx_is_archived` (`is_archived`),
  ADD KEY `fk_student_program` (`program_id`);

--
-- Indexes for table `student_face_embeddings`
--
ALTER TABLE `student_face_embeddings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `visitor_logs`
--
ALTER TABLE `visitor_logs`
  ADD PRIMARY KEY (`visitor_id`),
  ADD KEY `idx_qr_token` (`qr_token`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2300298;

--
-- AUTO_INCREMENT for table `authentication`
--
ALTER TABLE `authentication`
  MODIFY `auth_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=225;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  MODIFY `log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=208;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `student_face_embeddings`
--
ALTER TABLE `student_face_embeddings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=117;

--
-- AUTO_INCREMENT for table `visitor_logs`
--
ALTER TABLE `visitor_logs`
  MODIFY `visitor_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `authentication`
--
ALTER TABLE `authentication`
  ADD CONSTRAINT `authentication_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON UPDATE CASCADE;

--
-- Constraints for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  ADD CONSTRAINT `entry_exit_logs_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `entry_exit_logs_ibfk_2` FOREIGN KEY (`auth_id`) REFERENCES `authentication` (`auth_id`) ON DELETE CASCADE;

--
-- Constraints for table `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `fk_program_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_student_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `student_face_embeddings`
--
ALTER TABLE `student_face_embeddings`
  ADD CONSTRAINT `student_face_embeddings_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
