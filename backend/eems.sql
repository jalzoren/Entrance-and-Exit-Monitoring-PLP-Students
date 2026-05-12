-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 12, 2026 at 06:13 PM
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

--
-- Dumping data for table `authentication`
--

INSERT INTO `authentication` (`auth_id`, `student_id`, `method`, `auth_status`, `action`, `accuracy`, `duration`, `timestamp`, `failure_reason`, `confidence`, `processing_time_ms`, `quality_score`) VALUES
(225, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 20:59:01', NULL, NULL, NULL, NULL),
(226, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 20:59:12', NULL, NULL, NULL, NULL),
(227, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 20:59:57', NULL, NULL, NULL, NULL),
(228, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 21:00:15', NULL, NULL, NULL, NULL),
(229, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:08:16', NULL, NULL, NULL, NULL),
(230, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:08:47', NULL, NULL, NULL, NULL),
(231, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:11:12', NULL, NULL, NULL, NULL),
(232, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:11:29', NULL, NULL, NULL, NULL),
(233, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:11:36', NULL, NULL, NULL, NULL),
(234, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:12:12', NULL, NULL, NULL, NULL),
(235, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:58:03', NULL, NULL, NULL, NULL),
(236, '23-00298', 'QR', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 22:58:28', NULL, NULL, NULL, NULL),
(237, '23-00298', 'MANUAL', 'SUCCESS', NULL, NULL, NULL, '2026-05-12 23:01:06', NULL, NULL, NULL, NULL);

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

--
-- Dumping data for table `entry_exit_logs`
--

INSERT INTO `entry_exit_logs` (`log_id`, `student_id`, `auth_id`, `action`, `gate_window_violation`, `log_time`) VALUES
(208, '23-00298', 225, 'ENTRY', 0, '2026-05-12 20:59:01'),
(209, '23-00298', 226, 'EXIT', 0, '2026-05-12 20:59:12'),
(210, '23-00298', 227, 'ENTRY', 0, '2026-05-12 20:59:57'),
(211, '23-00298', 228, 'EXIT', 0, '2026-05-12 21:00:15'),
(212, '23-00298', 229, 'ENTRY', 0, '2026-05-12 22:08:16'),
(213, '23-00298', 230, 'EXIT', 0, '2026-05-12 22:08:47'),
(214, '23-00298', 231, 'ENTRY', 0, '2026-05-12 22:11:12'),
(215, '23-00298', 232, 'EXIT', 0, '2026-05-12 22:11:29'),
(216, '23-00298', 233, 'ENTRY', 0, '2026-05-12 22:11:36'),
(217, '23-00298', 234, 'EXIT', 0, '2026-05-12 22:12:12'),
(218, '23-00298', 235, 'ENTRY', 0, '2026-05-12 22:58:03'),
(219, '23-00298', 236, 'EXIT', 0, '2026-05-12 22:58:28'),
(220, '23-00298', 237, 'ENTRY', 0, '2026-05-12 23:01:06');

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
  `section` varchar(11) NOT NULL,
  `status` enum('Regular','Irregular','LOA','Dropout','Kickout','Graduated','Transferred','Inactive') NOT NULL DEFAULT 'Regular',
  `is_archived` tinyint(4) NOT NULL,
  `archived_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `email`, `first_name`, `last_name`, `middle_name`, `extension_name`, `program_id`, `year_level`, `section`, `status`, `is_archived`, `archived_status`, `created_at`, `updated_at`) VALUES
('23-00158', 'deleon_marithefrancine@plpasig.edu.ph', 'MARITHE FRANCINE', 'DE LEON', 'SUAREZ', NULL, 20, 2, 'Watson', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00160', 'fernandez_jamesandrew@plpasig.edu.ph', 'JAMES ANDREW', 'FERNANDEZ', 'BAYONA', NULL, 27, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00173', 'singin_amira@plpasig.edu.ph', 'AMIRA', 'SINGIN', 'ROBLES', NULL, 28, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00174', 'flavier_laurencejames@plpasig.edu.ph', 'LAURENCE JAMES', 'FLAVIER', 'LETANA', 'II', 19, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00178', 'campo_alwyn@plpasig.edu.ph', 'ALWYN', 'CAMPO', 'ORESCA', NULL, 20, 2, 'Henderson', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00179', 'mercado_lynnczyla@plpasig.edu.ph', 'LYNN CZYLA', 'ALPUERTO', 'MERCADO', NULL, 24, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00180', 'asong_jekko@plpasig.edu.ph', 'JEKKO', 'ASONG', 'FRANCO', NULL, 20, 1, 'Pender', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00188', 'torres_jamespeterson@plpasig.edu.ph', 'JAMES PETERSON', 'TORRES', 'SANTOS', NULL, 19, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00201', 'soriano_vincentmiguel@plpasig.edu.ph', 'VINCENT MIGUEL', 'SORIANO', 'PEREZ', NULL, 18, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00206', 'manlangit_jeshuapaulrogel@plpasig.edu.ph', 'JESHUA PAUL ROGEL', 'MANLANGIT', 'SARAZATE', NULL, 34, 1, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00221', 'miguel_vernalyn@plpasig.edu.ph', 'VERNALYN', 'MIGUEL', 'ESTORNINOS', NULL, 24, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00236', 'angeles_cyrene@plpasig.edu.ph', 'CYRENE', 'ANGELES', 'ZUNIEGA', NULL, 20, 1, 'Benner', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00251', 'macuana_arnolddominic@plpasig.edu.ph', 'ARNOLD DOMINIC', 'MACUANA', 'CASTILLO', NULL, 18, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', '2026-05-12 19:40:10'),
('23-00254', 'ramos_athenaeunice@plpasig.edu.ph', 'ATHENA EUNICE', 'RAMOS', 'CRUZ', NULL, 34, 1, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00257', 'bermudez_bryan@plpasig.edu.ph', 'BRYAN', 'BERMUDEZ', 'ROXAS', NULL, 28, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00260', 'angulo_michajean@plpasig.edu.ph', 'MICHA JEAN', 'ANGULO', 'CARABLE', NULL, 20, 1, 'Orem', 'Irregular', 0, NULL, '2026-05-12 11:37:39', '2026-05-12 19:38:52'),
('23-00269', 'larga_johnsebastian@plpasig.edu.ph', 'JOHN SEBASTIAN', 'LARGA', 'VICTORINO', NULL, 18, 3, 'E', 'LOA', 0, NULL, '2026-05-12 11:37:39', '2026-05-12 19:39:43'),
('23-00282', 'balogbog_charleswynn@plpasig.edu.ph', 'CHARLES WYNN', 'BALOGBOG', 'CONDES', NULL, 34, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:40', NULL),
('23-00283', 'javier_ronald@plpasig.edu.ph', 'RONALD', 'JAVIER', 'TENTIA', NULL, 24, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00295', 'castillon_biancarain@plpasig.edu.ph', 'BIANCA RAIN', 'CASTILLON', 'CAGURUNGAN', NULL, 27, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00298', 'bitancor_jerimiah@plpasig.edu.ph', 'JERIMIAH', 'BITANCOR', 'AMORA', NULL, 19, 3, 'E', 'Regular', 0, NULL, '2026-05-12 08:38:50', NULL),
('23-00306', 'pineda_karllouis@plpasig.edu.ph', 'KARL LOUIS', 'PINEDA', 'MIGUEL', NULL, 19, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00334', 'domrique_graceanne@plpasig.edu.ph', 'GRACE ANNE', 'DOMRIQUE', 'CO', NULL, 19, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-00898', 'masbate_jancarl@plpasig.edu.ph', 'JAN CARL', 'MASBATE', 'ABUYA', NULL, 18, 3, 'E', 'Irregular', 0, NULL, '2026-05-12 11:37:39', '2026-05-12 19:40:18'),
('23-01023', 'cruz_patriciadiane@plpasig.edu.ph', 'PATRICIA DIANE', 'CRUZ', 'RUIZ', NULL, 18, 2, 'E', 'Irregular', 0, NULL, '2026-05-12 11:37:39', '2026-05-12 19:39:34'),
('23-01041', 'ebuen_romell@plpasig.edu.ph', 'ROMELL', 'EBUEN', 'JACOBO', NULL, 24, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-01078', 'tadipa_johnlloydchristopher@plpasig.edu.ph', 'JOHN LLOYD CHRISTOPHER', 'TADIPA', 'BUENVIAJE', NULL, 19, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-01082', 'villanueva_angel@plpasig.edu.ph', 'ANGEL', 'VILLANUEVA', 'RICO', NULL, 27, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-01083', 'galinato_raynold@plpasig.edu.ph', 'RAYNOLD', 'GALINATO', 'BELMONTE', NULL, 24, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-01158', 'rojas_johnmel@plpasig.edu.ph', 'JOHNMEL', 'ROJAS', 'VILLAROSA', NULL, 19, 2, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:39', NULL),
('23-01283', 'onrubia_neiladrian@plpasig.edu.ph', 'NEIL ADRIAN', 'ONRUBIA', 'BERGONIO', 'Jr.', 34, 3, 'E', 'Regular', 0, NULL, '2026-05-12 11:37:40', NULL);

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
-- Table structure for table `system_logo`
--

CREATE TABLE `system_logo` (
  `id` int(11) NOT NULL DEFAULT 1,
  `logo_data` longblob DEFAULT NULL,
  `logo_type` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
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
('gate_entry_end', '22:00', '2026-05-12 23:04:53'),
('gate_entry_start', '07:00', '2026-05-12 23:04:53'),
('gate_exit_end', '22:00', '2026-05-12 23:04:53'),
('gate_exit_start', '07:00', '2026-05-12 23:04:53'),
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
(11, 'Bitancor, Jerimiah A.', 'bitancor_jeremiah@plpasig.edu.ph', 'Event / Activity', NULL, 'ENTRY', '2026-04-22 16:13:07', 'd841af60-cf74-4cff-b272-e1487421d87b'),
(12, 'Bitancor', 'bitancor_jeremiah@plpasig.edu.ph', 'Meeting with Faculty', NULL, 'EXIT', '2026-05-12 23:02:48', 'a7830d49-f452-4167-9d79-bb47bfcd0237');

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
-- Indexes for table `system_logo`
--
ALTER TABLE `system_logo`
  ADD PRIMARY KEY (`id`);

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
  MODIFY `auth_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=238;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `entry_exit_logs`
--
ALTER TABLE `entry_exit_logs`
  MODIFY `log_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=221;

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
  MODIFY `visitor_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

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
