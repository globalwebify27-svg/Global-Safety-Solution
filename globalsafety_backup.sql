-- MySQL dump 10.13  Distrib 8.0.39, for Win64 (x86_64)
--
-- Host: srv2205.hstgr.io    Database: u745630191_globalsafety
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_name_key` (`name`),
  UNIQUE KEY `accounts_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES ('13a4b02c-b9a7-4bc3-822f-4f9649e5c2a8','Cost of Goods Sold (COGS)','5000','EXPENSE',0.00,'2026-06-06 06:41:49.269000','2026-06-06 06:41:49.269000'),('28364802-a5ef-4154-80be-851a4e14d633','GST / Indirect Tax Payable','2200','LIABILITY',0.00,'2026-06-06 06:41:46.567000','2026-06-06 06:41:46.567000'),('435db12a-ab8e-4460-8b18-a13b2d8dba16','Utilities & General Expenses','5300','EXPENSE',0.00,'2026-06-06 06:41:50.821000','2026-06-06 06:41:50.821000'),('45991582-8e1f-40ad-a666-d103fe487d2a','Accounts Payable','2000','LIABILITY',0.00,'2026-06-06 06:41:46.041000','2026-06-06 06:41:46.041000'),('730350b9-783e-44ec-bd1d-96debaccd500','Retained Earnings','3100','EQUITY',0.00,'2026-06-06 06:41:47.627000','2026-06-06 06:41:47.627000'),('763f44e3-2be8-4187-a915-912d8a5b66e1','Service Revenue','4100','REVENUE',0.00,'2026-06-06 06:41:48.703000','2026-06-06 06:41:48.703000'),('79705b30-a239-4bfd-b8e6-00c7248d356c','Cash on Hand','1000','ASSET',0.00,'2026-06-06 06:41:43.697000','2026-06-06 06:41:43.697000'),('8780b65f-ba9d-4eba-8345-d50debb1b66f','Cash Account','1020','ASSET',0.00,'2026-06-11 08:21:32.936000','2026-06-11 08:21:32.936000'),('a9ee8b54-db8a-4945-88b6-acb780f16297','Rent & Office Expense','5200','EXPENSE',0.00,'2026-06-06 06:41:50.312000','2026-06-06 06:41:50.312000'),('c8adcb69-a73b-4806-832b-2b3044012801','Accounts Receivable','1200','ASSET',0.00,'2026-06-06 06:41:44.848000','2026-06-11 09:47:06.439000'),('cb7b49dd-10a3-4b2b-922b-54ba5d843c4b','Owner\'s Capital','3000','EQUITY',0.00,'2026-06-06 06:41:47.090000','2026-06-06 06:41:47.090000'),('d0d25cd6-21b9-4c93-a9bb-c86c684d64f9','Bank Current Account','1010','ASSET',0.00,'2026-06-06 06:41:44.388000','2026-06-06 06:41:44.388000'),('da3ec017-b3f2-4a28-84c1-a427b7527df0','Inventory Asset','1400','ASSET',0.00,'2026-06-06 06:41:45.519000','2026-06-06 06:41:45.519000'),('e3f87fe6-c5c2-49c5-a823-d90002bedd61','Salary & Wage Expense','5100','EXPENSE',0.00,'2026-06-06 06:41:49.806000','2026-06-06 06:41:49.806000'),('ed638f83-a1ef-47fb-8eae-8abd4b4b8b9f','Sales Revenue','4000','REVENUE',0.00,'2026-06-06 06:41:48.115000','2026-06-11 09:47:06.952000');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `id` varchar(36) NOT NULL,
  `asset_tag` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `model_number` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_value` decimal(15,2) DEFAULT NULL,
  `assigned_to` varchar(36) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'AVAILABLE',
  `last_maintenance` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_asset_tag_key` (`asset_tag`),
  UNIQUE KEY `assets_serial_number_key` (`serial_number`),
  KEY `assets_assigned_to_fkey` (`assigned_to`),
  CONSTRAINT `assets_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `date` date NOT NULL,
  `check_in` datetime(6) DEFAULT NULL,
  `check_out` datetime(6) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PRESENT',
  `location_in` varchar(255) DEFAULT NULL,
  `location_out` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_user_id_date_key` (`user_id`,`date`),
  CONSTRAINT `attendance_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES ('0725c2ab-26ca-4138-9829-a9b784b84299','63b9ffd4-0526-47f7-ae5a-565625197370','2026-05-22','2026-05-22 15:04:47.385000',NULL,'PRESENT','Remote / Field',NULL,'2026-05-22 15:04:47.386000','2026-05-22 15:04:47.386000'),('133af092-2e9e-4c87-a687-8cc09711e0bc','63b9ffd4-0526-47f7-ae5a-565625197370','2026-05-16','2026-05-16 12:13:07.852000','2026-05-16 12:13:25.668000','PRESENT','Remote / Field','23.3499, 85.3105','2026-05-16 12:13:07.854000','2026-05-16 12:13:25.669000'),('3ea5df60-b2f2-4caa-b0fc-6b4365d1da73','63b9ffd4-0526-47f7-ae5a-565625197370','2026-06-08','2026-06-08 06:18:50.648000','2026-06-08 06:18:56.543000','PRESENT','23.3499, 85.3105','23.3499, 85.3105','2026-06-08 06:18:50.649000','2026-06-08 06:18:56.544000'),('f69232a0-f7e1-4782-938b-2590672d2f14','63b9ffd4-0526-47f7-ae5a-565625197370','2026-05-25','2026-05-25 08:09:09.458000','2026-05-25 08:09:12.970000','PRESENT','23.3499, 85.3105','23.3499, 85.3105','2026-05-25 08:09:09.459000','2026-05-25 08:09:12.971000');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `old_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_data`)),
  `new_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_data`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('06f42a84-097d-42be-b35f-500c3921a38b','System','UPDATED','LEAD','e09e0b5b-02ff-405d-827d-d83636ade8b8',NULL,'{\"activities\":{\"create\":{\"type\":\"NOTE\",\"subject\":\"NOTE logged\",\"description\":\"discuss in Tuesday 26.05.26 \",\"date\":\"2026-05-23T14:56:31.469Z\"}}}','2026-05-23 14:56:37.019000'),('1cda5011-a339-4788-83ad-13d29ddbace4','System','CREATED','LEAD','e09e0b5b-02ff-405d-827d-d83636ade8b8',NULL,'{\"company_name\":\"global webify \",\"contact_person\":\"vikram\",\"expected_value\":50000.0}','2026-05-22 12:43:22.235000'),('1e452d1f-6af4-4945-a9e5-0e260dee6228','System','STAFF_REASSIGNED','CLIENT','5173b7af-073b-44e1-a703-3bc0b4c107b9','{\"assigned_staff_id\":null,\"assigned_staff_name\":\"Unassigned\",\"completed_projects\":0,\"pending_projects\":0,\"completed_tasks\":0,\"pending_tasks\":0,\"completed_work_orders\":0,\"pending_work_orders\":0,\"completed_inspections\":0,\"pending_inspections\":0}','{\"assigned_staff_id\":\"349ed967-9ad6-4278-add8-80bed2b99c5e\",\"assigned_staff_name\":\"Nayan Mahato\"}','2026-05-25 11:12:38.566000'),('1f3165e6-bd80-4b51-8b9c-c92ba6af9017','System','CONVERTED_TO_CLIENT','LEAD','73ffb695-ee52-4a05-b1c1-18209e5f2373',NULL,'{\"client_id\":\"5173b7af-073b-44e1-a703-3bc0b4c107b9\",\"status\":\"WON\"}','2026-05-25 11:11:48.984000'),('40d160d4-38cf-4325-b9f9-2321152b2747','System','STAFF_REASSIGNED','CLIENT','5615889d-85e6-4005-9cc0-ed84eae901ce','{\"assigned_staff_id\":null,\"assigned_staff_name\":\"Unassigned\",\"completed_projects\":0,\"pending_projects\":1,\"completed_tasks\":0,\"pending_tasks\":2,\"completed_work_orders\":0,\"pending_work_orders\":1,\"completed_inspections\":0,\"pending_inspections\":0}','{\"assigned_staff_id\":\"57b706ad-5123-4f1e-8590-e91beb947e7d\",\"assigned_staff_name\":\"AQUEEL AHMAD\"}','2026-05-25 10:40:07.193000'),('4450b7ea-4981-4141-abaf-bfab70ea680f','System','CREATED','LEAD','695dfcd5-3176-424e-846c-6a86de6362db',NULL,'{\"company_name\":\"global safety\",\"contact_person\":\"vercel\",\"expected_value\":20000.0}','2026-05-25 08:30:06.912000'),('55a72544-168e-413a-b258-cf0fee98d25c','System','UPDATED','LEAD','73ffb695-ee52-4a05-b1c1-18209e5f2373',NULL,'{\"status\":\"CONTACTED\"}','2026-05-25 11:11:26.036000'),('5f83f126-4d19-407e-a803-74d3fb1afdb1','System','UPDATED','LEAD','73ffb695-ee52-4a05-b1c1-18209e5f2373',NULL,'{\"status\":\"CONTACTED\"}','2026-05-25 11:11:29.151000'),('97df5a1c-ce04-46a6-8e52-76816801a3e0','System','CREATED','LEAD','73ffb695-ee52-4a05-b1c1-18209e5f2373',NULL,'{\"company_name\":\"DAV\",\"contact_person\":\"john kabir\",\"expected_value\":350000.0}','2026-05-25 11:10:42.004000'),('c2f05757-9d33-4b66-ab00-b3b028407d4b','System','STAFF_REASSIGNED','CLIENT','6a04c499-04d4-4225-a02f-7f8f8ff7a428','{\"assigned_staff_id\":null,\"assigned_staff_name\":\"Unassigned\",\"completed_projects\":0,\"pending_projects\":1,\"completed_tasks\":2,\"pending_tasks\":4,\"completed_work_orders\":0,\"pending_work_orders\":4,\"completed_inspections\":0,\"pending_inspections\":0}','{\"assigned_staff_id\":\"e013d9f9-b6dc-46fe-a797-63cb9f716860\",\"assigned_staff_name\":\"MD SAMEER\"}','2026-05-23 04:42:47.013000'),('cf6c5f78-d5c7-4c20-872b-7f93a4eb05f4','63b9ffd4-0526-47f7-ae5a-565625197370','CREATED','LEAD','c38b15e6-0285-407f-9180-329c0d01ca7c',NULL,'{\"company_name\":\"TEST-Audit company \",\"contact_person\":\"omkar\",\"expected_value\":\"5000\"}','2026-06-11 09:36:49.105000'),('d2582d4e-eb0a-4956-b58f-df31d18f3ae2','System','STAFF_REASSIGNED','CLIENT','eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','{\"assigned_staff_id\":null,\"assigned_staff_name\":\"Unassigned\",\"completed_projects\":0,\"pending_projects\":0,\"completed_tasks\":0,\"pending_tasks\":0,\"completed_work_orders\":0,\"pending_work_orders\":0,\"completed_inspections\":0,\"pending_inspections\":0}','{\"assigned_staff_id\":\"349ed967-9ad6-4278-add8-80bed2b99c5e\",\"assigned_staff_name\":\"Nayan Mahato\"}','2026-05-25 10:45:15.936000');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `certificates`
--

DROP TABLE IF EXISTS `certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificates` (
  `id` varchar(36) NOT NULL,
  `inspection_id` varchar(36) NOT NULL,
  `certificate_no` varchar(100) NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `validity_period` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  `pdf_url` varchar(191) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificates_inspection_id_key` (`inspection_id`),
  UNIQUE KEY `certificates_certificate_no_key` (`certificate_no`),
  CONSTRAINT `certificates_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `certificates`
--

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES ('10207056-2de3-4d1e-b91b-e8d6f8940322','036f6472-c62c-458f-bed7-6ced0f5acae1','GSS-2026-ZADGS6','2026-05-27','2027-05-27','1y','ACTIVE',NULL,NULL,'2026-05-27 07:04:56.916000','2026-05-27 07:04:56.916000'),('3d46116b-2054-4057-9dbf-0d00ab06efc8','a9fb153c-77b1-4f55-96cf-d410242f9689','GSS-2026-5J0ZM5','2026-05-25','2027-05-25','1y','ACTIVE',NULL,NULL,'2026-05-25 06:42:28.562000','2026-05-25 06:42:28.562000'),('dee2ba61-52e0-4f91-bc05-1f3c3ec37f16','ef03b194-3a9e-4d94-a26c-fb78de6d1d5d','GSS-2026-MHDBDJ','2026-05-25','2027-05-25','1y','ACTIVE',NULL,NULL,'2026-05-25 06:21:27.134000','2026-05-25 06:21:27.134000');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checklist_items`
--

DROP TABLE IF EXISTS `checklist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_items` (
  `id` varchar(36) NOT NULL,
  `service_id` varchar(36) NOT NULL,
  `question` varchar(191) NOT NULL,
  `field_type` varchar(50) NOT NULL DEFAULT 'BOOLEAN',
  `options` varchar(191) DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `checklist_items_service_id_fkey` (`service_id`),
  CONSTRAINT `checklist_items_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `service_products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checklist_items`
--

LOCK TABLES `checklist_items` WRITE;
/*!40000 ALTER TABLE `checklist_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `checklist_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_contacts`
--

DROP TABLE IF EXISTS `client_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_contacts` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `client_contacts_client_id_fkey` (`client_id`),
  CONSTRAINT `client_contacts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_contacts`
--

LOCK TABLES `client_contacts` WRITE;
/*!40000 ALTER TABLE `client_contacts` DISABLE KEYS */;
INSERT INTO `client_contacts` VALUES ('831ef7a4-5023-4e51-862c-91bf3141fa8a','5615889d-85e6-4005-9cc0-ed84eae901ce','vikram','1425626637','globalwebify@gmail.com',NULL,1,'2026-05-25 08:15:21.169000','2026-05-25 08:15:21.169000'),('a7120c6a-7939-4586-b5db-797b71328c3a','5173b7af-073b-44e1-a703-3bc0b4c107b9','john kabir','1239876450','jk@gmail.com',NULL,1,'2026-05-25 11:11:48.434000','2026-05-25 11:11:48.434000'),('c46f6d9d-0924-4b9f-be7d-cce0e92e2495','eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','pranesh mishra','8970654321','pm@gmail.com','vice-principal',0,'2026-05-25 10:36:22.460000','2026-05-25 10:36:22.460000'),('ec9b963f-a0c4-486b-8447-1230ed0658ed','e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5','nayan','838838383783','nayan@gmail.com','dev',0,'2026-05-23 07:47:14.733000','2026-05-23 07:47:14.733000');
/*!40000 ALTER TABLE `client_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `billing_address` varchar(191) DEFAULT NULL,
  `shipping_address` varchar(191) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `assigned_staff_id` varchar(36) DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT NULL,
  `payment_terms` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `clients_assigned_staff_id_fkey` (`assigned_staff_id`),
  CONSTRAINT `clients_assigned_staff_id_fkey` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES ('5173b7af-073b-44e1-a703-3bc0b4c107b9','DAV',NULL,NULL,'jk@gmail.com','1239876450',NULL,NULL,NULL,NULL,NULL,NULL,'Cold Call',1,'2026-05-25 11:11:48.160000','2026-05-25 11:12:38.903000','349ed967-9ad6-4278-add8-80bed2b99c5e',NULL,NULL),('5615889d-85e6-4005-9cc0-ed84eae901ce','global webify ',NULL,NULL,'globalwebify@gmail.com','1425626637',NULL,NULL,NULL,NULL,NULL,NULL,'LinkedIn',1,'2026-05-25 08:15:20.931000','2026-05-25 10:40:07.522000','57b706ad-5123-4f1e-8590-e91beb947e7d',NULL,NULL),('6a04c499-04d4-4225-a02f-7f8f8ff7a428','ITC  LIMITED','10AAACI5950L2ZO','AAACI5950l','Deepak.Behera@itc.in','9512990669',NULL,NULL,'MUNGER',NULL,NULL,NULL,'DAIRY  (FOOD DIVISION)',1,'2026-05-22 14:06:05.645000','2026-05-23 04:42:47.375000','e013d9f9-b6dc-46fe-a797-63cb9f716860',NULL,NULL),('6ce3c551-07d2-444f-b19d-4bd26e2fa5fa','ljscbljadc','nabcn',',scbc','csk.n@gmail.com','38738633',NULL,NULL,'goa',NULL,NULL,NULL,'manufacturing',1,'2026-05-22 12:42:15.050000','2026-05-22 12:42:15.050000','63b9ffd4-0526-47f7-ae5a-565625197370',NULL,NULL),('e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5','nayan enterprises','j sxhjbhxbsjhb','sxjhshxjvhjshj','nayan@gmail.com','1234567890','2nd Floor Ashok Nagar Rd, opposite Sai Medical',NULL,'Ranchi','Jharkhand',NULL,NULL,'hospital',0,'2026-05-23 07:47:14.733000','2026-05-23 07:47:26.502000','63b9ffd4-0526-47f7-ae5a-565625197370',NULL,NULL),('eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','DAV','5363gd773773','vddfdgshsfsf','anuj@gmail.com','0987654321','silli , jharkhand',NULL,'silli','ranchi',NULL,NULL,'school',1,'2026-05-25 10:36:22.460000','2026-05-25 10:45:16.287000','349ed967-9ad6-4278-add8-80bed2b99c5e',NULL,NULL);
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compliance_logs`
--

DROP TABLE IF EXISTS `compliance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compliance_logs` (
  `id` varchar(36) NOT NULL,
  `compliance_id` varchar(36) NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` varchar(36) DEFAULT NULL,
  `performed_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `remarks` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `compliance_logs_compliance_id_fkey` (`compliance_id`),
  KEY `compliance_logs_performed_by_fkey` (`performed_by`),
  CONSTRAINT `compliance_logs_compliance_id_fkey` FOREIGN KEY (`compliance_id`) REFERENCES `compliances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `compliance_logs_performed_by_fkey` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compliance_logs`
--

LOCK TABLES `compliance_logs` WRITE;
/*!40000 ALTER TABLE `compliance_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `compliance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compliances`
--

DROP TABLE IF EXISTS `compliances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compliances` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `compliance_type` varchar(100) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `renewal_cycle_days` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  `reminder_sent` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `compliances_client_id_fkey` (`client_id`),
  CONSTRAINT `compliances_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compliances`
--

LOCK TABLES `compliances` WRITE;
/*!40000 ALTER TABLE `compliances` DISABLE KEYS */;
INSERT INTO `compliances` VALUES ('09829784-3ae4-433c-a2b8-3db22e5a8355','6a04c499-04d4-4225-a02f-7f8f8ff7a428','Safety Compliance','GSS-2026-MHDBDJ','2026-05-25','2027-05-25',365,'ACTIVE',0,'2026-05-25 06:21:27.466000','2026-05-25 06:21:27.466000'),('12de596d-baff-48a2-9569-72fca0a39d7c','e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5','Safety Compliance','GSS-2026-5J0ZM5','2026-05-25','2027-05-25',365,'ACTIVE',0,'2026-05-25 06:42:28.918000','2026-05-25 06:42:28.918000'),('61db13db-e51e-452e-a765-e562f6e3a951','5173b7af-073b-44e1-a703-3bc0b4c107b9','Safety Compliance','GSS-2026-ZADGS6','2026-05-27','2027-05-27',365,'ACTIVE',0,'2026-05-27 07:04:57.245000','2026-05-27 07:04:57.245000');
/*!40000 ALTER TABLE `compliances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `file_url` varchar(191) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_size` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `client_id` varchar(36) DEFAULT NULL,
  `project_id` varchar(36) DEFAULT NULL,
  `compliance_id` varchar(36) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `uploaded_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `lead_id` varchar(36) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `test_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `documents_client_id_fkey` (`client_id`),
  KEY `documents_compliance_id_fkey` (`compliance_id`),
  KEY `documents_project_id_fkey` (`project_id`),
  KEY `documents_uploaded_by_fkey` (`uploaded_by`),
  KEY `documents_lead_id_fkey` (`lead_id`),
  CONSTRAINT `documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_compliance_id_fkey` FOREIGN KEY (`compliance_id`) REFERENCES `compliances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `batch_number` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'AVAILABLE',
  `next_inspection_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `equipment_serial_number_key` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment`
--

LOCK TABLES `equipment` WRITE;
/*!40000 ALTER TABLE `equipment` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment_assignments`
--

DROP TABLE IF EXISTS `equipment_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment_assignments` (
  `id` varchar(36) NOT NULL,
  `equipment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `assigned_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `status` varchar(50) NOT NULL DEFAULT 'ASSIGNED',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `equipment_assignments_equipment_id_fkey` (`equipment_id`),
  CONSTRAINT `equipment_assignments_equipment_id_fkey` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment_assignments`
--

LOCK TABLES `equipment_assignments` WRITE;
/*!40000 ALTER TABLE `equipment_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment_inspections`
--

DROP TABLE IF EXISTS `equipment_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment_inspections` (
  `id` varchar(36) NOT NULL,
  `equipment_id` varchar(36) NOT NULL,
  `inspection_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `next_due_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PASSED',
  `remarks` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `equipment_inspections_equipment_id_fkey` (`equipment_id`),
  CONSTRAINT `equipment_inspections_equipment_id_fkey` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment_inspections`
--

LOCK TABLES `equipment_inspections` WRITE;
/*!40000 ALTER TABLE `equipment_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment_inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` varchar(36) NOT NULL,
  `description` varchar(191) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `category` varchar(100) NOT NULL,
  `date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `vendor_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) NOT NULL,
  `approved_by` varchar(36) DEFAULT NULL,
  `attachment_url` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_vendor_id_fkey` (`vendor_id`),
  KEY `expenses_user_id_fkey` (`user_id`),
  KEY `expenses_approved_by_fkey` (`approved_by`),
  CONSTRAINT `expenses_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `expenses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `expenses_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_permissions`
--

DROP TABLE IF EXISTS `feature_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feature_permissions` (
  `id` varchar(36) NOT NULL,
  `feature_id` varchar(36) NOT NULL,
  `role_id` varchar(36) NOT NULL,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_read` tinyint(1) NOT NULL DEFAULT 0,
  `can_update` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `assigned_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_permissions_feature_id_role_id_key` (`feature_id`,`role_id`),
  KEY `feature_permissions_role_id_fkey` (`role_id`),
  CONSTRAINT `feature_permissions_feature_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `feature_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_permissions`
--

LOCK TABLES `feature_permissions` WRITE;
/*!40000 ALTER TABLE `feature_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `feature_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `features`
--

DROP TABLE IF EXISTS `features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `features` (
  `id` varchar(36) NOT NULL,
  `module_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `features_slug_key` (`slug`),
  KEY `features_module_id_fkey` (`module_id`),
  CONSTRAINT `features_module_id_fkey` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `features`
--

LOCK TABLES `features` WRITE;
/*!40000 ALTER TABLE `features` DISABLE KEYS */;
/*!40000 ALTER TABLE `features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspection_items`
--

DROP TABLE IF EXISTS `inspection_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_items` (
  `id` varchar(36) NOT NULL,
  `inspection_id` varchar(36) NOT NULL,
  `description` varchar(191) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `notes` varchar(191) DEFAULT NULL,
  `photo_url` varchar(191) DEFAULT NULL,
  `expenditure` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `inspection_items_inspection_id_fkey` (`inspection_id`),
  CONSTRAINT `inspection_items_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspection_items`
--

LOCK TABLES `inspection_items` WRITE;
/*!40000 ALTER TABLE `inspection_items` DISABLE KEYS */;
INSERT INTO `inspection_items` VALUES ('14522294-4152-4e59-8344-ea8f41a42572','47287d85-9eed-419c-ad93-ccaf03c92538','General Safety Check','PENDING',NULL,NULL,0.00),('1f5a8fc9-11e9-40c6-946a-27d07ead886b','036f6472-c62c-458f-bed7-6ced0f5acae1','General Safety Check','PENDING',NULL,NULL,0.00),('21853a46-32aa-464f-812c-828b90654a81','a230cffb-d1a4-4da9-b30d-b040ec85d803','General Safety Check','PENDING',NULL,NULL,0.00),('3c79b003-c635-457a-b42e-63bf4ce063c9','482ec2f3-f90d-47f1-b47d-ddf7128ce19e','General Safety Check','PENDING',NULL,NULL,0.00),('4d54a287-9a8b-491c-9628-b4ac84f39ebd','a9fb153c-77b1-4f55-96cf-d410242f9689','General Safety Check','PASS','finance check',NULL,12000.00),('6eb9ebb9-2fcd-4090-a679-a6ff1f1ad975','ade9d121-7a0e-4587-af40-9011abf2a269','General Safety Check','PENDING','',NULL,0.00),('9ced7236-2476-4013-b1c2-3fcba70439e6','947d4c17-f9e5-4128-b8b9-5f8045354332','General Safety Check','PENDING',NULL,NULL,0.00),('b8a1aad0-a6c7-457a-9b1b-490d789e61d8','482ec2f3-f90d-47f1-b47d-ddf7128ce19e','EOT Crane','PENDING',NULL,NULL,0.00),('bb56347b-c4c5-40fd-bd51-57228e932948','ef03b194-3a9e-4d94-a26c-fb78de6d1d5d','General Safety Check','PASS','gd',NULL,1200.00),('e77546d5-17ad-471c-999b-20d00da455b0','8c37c238-ac04-47c2-a660-714d0093d791','General Safety Check','PENDING','',NULL,0.00),('fac6a8d9-7046-4a47-9314-8ce53dd5076e','891c01c7-c070-42b8-98df-99793ac3f474','General Safety Check','PENDING','fire safety ',NULL,1999.00);
/*!40000 ALTER TABLE `inspection_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspection_reports`
--

DROP TABLE IF EXISTS `inspection_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspection_reports` (
  `id` varchar(36) NOT NULL,
  `inspection_id` varchar(36) NOT NULL,
  `report_text` text NOT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_reports_inspection_id_key` (`inspection_id`),
  CONSTRAINT `inspection_reports_inspection_id_fkey` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspection_reports`
--

LOCK TABLES `inspection_reports` WRITE;
/*!40000 ALTER TABLE `inspection_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `inspection_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspections`
--

DROP TABLE IF EXISTS `inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspections` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `project_id` varchar(36) DEFAULT NULL,
  `engineer_id` varchar(36) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `completed_date` datetime(6) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'SCHEDULED',
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `work_order_id` varchar(36) DEFAULT NULL,
  `expenditure` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `inspections_client_id_fkey` (`client_id`),
  KEY `inspections_engineer_id_fkey` (`engineer_id`),
  KEY `inspections_project_id_fkey` (`project_id`),
  KEY `inspections_work_order_id_fkey` (`work_order_id`),
  CONSTRAINT `inspections_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inspections_engineer_id_fkey` FOREIGN KEY (`engineer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inspections_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `inspections_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspections`
--

LOCK TABLES `inspections` WRITE;
/*!40000 ALTER TABLE `inspections` DISABLE KEYS */;
INSERT INTO `inspections` VALUES ('036f6472-c62c-458f-bed7-6ced0f5acae1','5173b7af-073b-44e1-a703-3bc0b4c107b9',NULL,'07c4d2f1-5e37-4b70-9024-7ad032ea1c91','2026-05-30','2026-05-27 07:04:56.310000','COMPLETED',23.34988430,85.31051501,'{\"draft_cert_type\":\"FACTORIES_ACT_28_29\",\"draft_cert_data\":{\"validity_period\":\"1y\",\"expiry_date\":\"2027-05-27\",\"scope\":\"\",\"remarks\":\"\",\"eqpt_occupier_name\":\"DAV\",\"eqpt_factory_address\":\"unnamed road 3rd floor near kanke \",\"eqpt_name\":\"CHAIN PULLEY BLOCK 1\",\"eqpt_swl\":\"6 Ton\",\"eqpt_lift\":\"4 Mtr\",\"eqpt_serial_no\":\"RRL/CPB/04\",\"eqpt_mfg\":\"11/2023\",\"eqpt_chain_dia\":\"6 mm\",\"eqpt_hchain_dia\":\"3 mm\",\"eqpt_mfd_by\":\"N.A\",\"eqpt_location\":\"Inside the Plant\",\"stab_factory_name\":\"DAV\",\"stab_location\":\"MUZAFFARPUR\",\"stab_postal_address\":\"\",\"stab_occupier_name\":\"DAV\",\"stab_mfg_process\":\"SNACKS & NAMKEENS\",\"stab_worker_layout_ref\":\"As per approved layout (Attached Report)\",\"stab_plan_letter_no\":\"153/P\",\"stab_plan_letter_date\":\"09.12.2014\",\"pv_occupier_name\":\"DAV\",\"pv_factory_address\":\"\",\"pv_vessel_desc\":\"AIR RECEIVER (VERTICAL)\",\"pv_vessel_cap_no\":\"CAP- 550 Ltr, Sr/Id No.- 7806, Loc- Compressor Room- 2\",\"pv_manufacturer\":\"TALLERES VALSI\",\"pv_process\":\"For Plant Process.\",\"pv_mfg_year\":\"25/09/2024\",\"pv_first_use_date\":\"2025\",\"pv_wall_thickness\":\"Shell- 16.5mm, 16.6mm, 16.7mm T.Disc-15.2mm, 15.4mm, 15.3mm B.Disc-15.3mm, 15.2mm, 15.1mm\",\"pv_safe_pressure\":\"45 BAR\",\"pv_vessel_history\":\"As reported, the vessels has been working in order since inspection\",\"pv_hyd_test_by_mfg\":\"Hydraulic Test done by the manufacturer on N.A\",\"pv_exposed_weather\":\"Under Shed\",\"pv_exam_details\":\"Thorough Physical examination & Ultrasonic test done.\",\"pv_hyd_test_pressure\":\"N.A\",\"pv_inaccessible_parts\":\"Internal Surface\",\"pv_vessel_condition\":\"External: Good, Internal: Inaccessible.\",\"pv_fittings_provided\":\"Pressure gauge, Safety Valve & Drain Valve.\",\"pv_fittings_maintained\":\"Yes.\",\"pv_repairs_required\":\"No major defect affecting the safe working has been observed at the time of examination.\",\"pv_calculated_safe_pressure\":\"45 BAR\",\"pv_repairs_safe_pressure\":\"N.A\",\"pv_other_observations\":\"Satisfactory.\",\"sv_occupier_name\":\"DAV\",\"sv_factory_address\":\"\",\"sv_valve_desc\":\"PRESSURE SAFETY VALVE\",\"sv_valve_cap_no\":\"CAP- 14182.0 kg/hr, Id/Sr No.- 201807175, Loc- MLP Shed\",\"sv_manufacturer\":\"Anderson Greenwood Crosby Sanmar Limited.\",\"sv_process\":\"For Plant Process\",\"sv_mfg_year\":\"N.A\",\"sv_commission_date\":\"N.A\",\"sv_set_pressure\":\"58.52 kg/cm²\",\"sv_valve_history\":\"As reported, the TSV has been working in order since inspection\",\"sv_last_hyd_test\":\"On 11.10.2025 @ 58.52 kg/cm²\",\"sv_exposed_weather\":\"Under Shed\",\"sv_inaccessible_parts\":\"Internal\",\"sv_exam_details\":\"Through Physical examination & Hydro test done.\",\"sv_fittings_maintained\":\"Yes.\",\"sv_repairs_required\":\"No major defect affecting the set pressure has been observed at the time of examination.\",\"sv_repairs_set_pressure\":\"N.A\",\"sv_other_observations\":\"Satisfactory.\",\"competency_no\":\"663, dated 11.11.2025, valid upto 10.11.2026\",\"competent_person\":\"karan\"},\"admin_feedback\":\"\"}','2026-05-27 06:21:34.264000','2026-05-27 07:04:56.311000',NULL,0.00),('47287d85-9eed-419c-ad93-ccaf03c92538','5173b7af-073b-44e1-a703-3bc0b4c107b9',NULL,'07c4d2f1-5e37-4b70-9024-7ad032ea1c91','2026-06-05',NULL,'SCHEDULED',NULL,NULL,NULL,'2026-06-05 04:53:34.282000','2026-06-05 04:53:34.282000',NULL,0.00),('482ec2f3-f90d-47f1-b47d-ddf7128ce19e','e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5',NULL,'c2830a86-9d1d-42e5-8180-81ec39c45414','2026-06-22',NULL,'SCHEDULED',NULL,NULL,NULL,'2026-06-22 06:31:32.171000','2026-06-22 06:31:32.171000',NULL,0.00),('891c01c7-c070-42b8-98df-99793ac3f474','6a04c499-04d4-4225-a02f-7f8f8ff7a428',NULL,'b49f655d-1d47-461b-8c1d-dc3beb948bd6','2026-06-01',NULL,'IN_PROGRESS',NULL,NULL,NULL,'2026-05-25 07:45:32.878000','2026-05-25 08:11:15.288000',NULL,0.00),('8c37c238-ac04-47c2-a660-714d0093d791','e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5',NULL,'63b9ffd4-0526-47f7-ae5a-565625197370','2026-06-01',NULL,'IN_PROGRESS',NULL,NULL,NULL,'2026-05-25 06:23:20.372000','2026-05-25 06:26:14.255000',NULL,0.00),('947d4c17-f9e5-4128-b8b9-5f8045354332','6a04c499-04d4-4225-a02f-7f8f8ff7a428',NULL,'b49f655d-1d47-461b-8c1d-dc3beb948bd6','2026-06-20',NULL,'SCHEDULED',NULL,NULL,NULL,'2026-05-25 08:14:32.561000','2026-05-25 08:14:32.561000',NULL,0.00),('a230cffb-d1a4-4da9-b30d-b040ec85d803','5173b7af-073b-44e1-a703-3bc0b4c107b9',NULL,'07c4d2f1-5e37-4b70-9024-7ad032ea1c91','2026-05-30',NULL,'SCHEDULED',NULL,NULL,NULL,'2026-05-27 06:21:33.248000','2026-05-27 06:21:33.248000',NULL,0.00),('a9fb153c-77b1-4f55-96cf-d410242f9689','e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5',NULL,'63b9ffd4-0526-47f7-ae5a-565625197370','2026-06-01',NULL,'COMPLETED',NULL,NULL,NULL,'2026-05-25 06:23:19.833000','2026-05-25 06:42:32.892000',NULL,0.00),('ade9d121-7a0e-4587-af40-9011abf2a269','5173b7af-073b-44e1-a703-3bc0b4c107b9',NULL,'07c4d2f1-5e37-4b70-9024-7ad032ea1c91','2026-06-05',NULL,'IN_PROGRESS',NULL,NULL,NULL,'2026-06-05 04:53:37.653000','2026-06-22 06:52:02.216000',NULL,0.00),('ef03b194-3a9e-4d94-a26c-fb78de6d1d5d','6a04c499-04d4-4225-a02f-7f8f8ff7a428',NULL,'b49f655d-1d47-461b-8c1d-dc3beb948bd6','2026-05-30',NULL,'COMPLETED',NULL,NULL,NULL,'2026-05-25 06:19:48.470000','2026-05-25 06:21:26.415000',NULL,0.00);
/*!40000 ALTER TABLE `inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_items` (
  `id` varchar(36) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'PCS',
  `min_stock` int(11) NOT NULL DEFAULT 0,
  `current_stock` int(11) NOT NULL DEFAULT 0,
  `price_per_unit` decimal(15,2) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_items_sku_key` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `description` varchar(191) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id_fkey` (`invoice_id`),
  CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
INSERT INTO `invoice_items` VALUES ('079eec34-d9f6-445d-8c76-6285f397c94d','c2da4b1f-97da-4c11-947d-f339c230272a','AMMONIA PIPELINE TESTING',12,2700.00,32400.00),('1782f43a-2115-40f0-adf2-5f13f342aa0f','c2da4b1f-97da-4c11-947d-f339c230272a','PASSANGER LIFT TESTING AND CERTIFICATION',2,2000.00,4000.00),('19ef158e-8763-4f54-8059-485abfa58bed','60007abb-ed36-460b-8dba-25627251c6fd','Custom Proposal for global webify ',1,50000.00,50000.00),('2384f26c-ff84-4efe-a59c-e7f022417459','c2da4b1f-97da-4c11-947d-f339c230272a','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',12,2700.00,32400.00),('6fa007c8-e46d-4416-ac75-ca1facb90cb7','991d5293-6399-46df-89b4-d7f579ccc68d','Shoes',120,30000.00,3600000.00),('bcc9e14d-18d3-4bbf-9648-d55fd9cf9cdf','eb844b0d-3c9f-470f-a092-6624e0757035','smart tv',20,30000.00,600000.00),('ca7441c6-d897-4ae2-b73e-8d3a77f4caef','15fe9365-be8a-4ee1-abf5-3d2a6201a91b','smart board',10,30000.00,300000.00),('d1c35962-cab3-4fe9-9ea1-c29ad1cfd1de','c2da4b1f-97da-4c11-947d-f339c230272a','GOODS LIFT/LOADER TESTING AND CERTIFICATION',2,1500.00,3000.00);
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `quotation_id` varchar(36) DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `due_date` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cgst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sgst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `igst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'UNPAID',
  `notes` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `balance_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `work_order_id` varchar(36) DEFAULT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `po_date` date DEFAULT NULL,
  `po_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_invoice_number_key` (`invoice_number`),
  UNIQUE KEY `invoices_quotation_id_key` (`quotation_id`),
  KEY `invoices_client_id_fkey` (`client_id`),
  KEY `invoices_work_order_id_fkey` (`work_order_id`),
  CONSTRAINT `invoices_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoices_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoices_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('15fe9365-be8a-4ee1-abf5-3d2a6201a91b','eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','c19a1750-a6d3-4342-8a75-0f723a9e9e4d','INV-2026-0004','2026-05-25 10:57:41.110000','2026-06-09',300000.00,51300.00,25650.00,25650.00,0.00,336300.00,'PAID','Invoice generated for Quotation GSS/2026/005','2026-05-25 10:57:41.110000','2026-05-25 12:08:35.788000',0.00,0.00,NULL,15000.00,NULL,NULL),('60007abb-ed36-460b-8dba-25627251c6fd','5615889d-85e6-4005-9cc0-ed84eae901ce','1ed972bb-d078-4b46-be4d-ae9ecbbb20a8','INV-2026-0003','2026-05-25 08:15:23.552000','2026-06-09',50000.00,0.00,0.00,0.00,0.00,50000.00,'UNPAID','Invoice generated for Quotation GSS/2026/002','2026-05-25 08:15:23.552000','2026-05-25 08:15:23.552000',0.00,0.00,NULL,0.00,NULL,NULL),('991d5293-6399-46df-89b4-d7f579ccc68d','6a04c499-04d4-4225-a02f-7f8f8ff7a428','821923a6-4e51-4f0e-b676-5c7231fee070','INV-2026-0002','2026-05-25 07:47:59.147000','2026-06-09',3600000.00,615600.00,307800.00,307800.00,0.00,4035600.00,'UNPAID','Invoice generated for Quotation GSS/2026/004','2026-05-25 07:47:59.147000','2026-05-25 07:47:59.147000',0.00,0.00,NULL,180000.00,NULL,NULL),('c2da4b1f-97da-4c11-947d-f339c230272a','6a04c499-04d4-4225-a02f-7f8f8ff7a428','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba','INV-2026-0001','2026-05-23 15:06:56.750000','2026-06-07',71800.00,12924.00,6462.00,6462.00,0.00,84724.00,'UNPAID','Invoice generated for Quotation GSS/2026/003','2026-05-23 15:06:56.750000','2026-05-23 15:06:56.750000',0.00,0.00,NULL,0.00,NULL,NULL),('eb844b0d-3c9f-470f-a092-6624e0757035','5173b7af-073b-44e1-a703-3bc0b4c107b9','30bead19-493d-4bd8-8d78-862574b303fb','INV-2026-0005','2026-05-25 12:10:40.093000','2026-06-09',600000.00,107999.10,53999.55,53999.55,0.00,707994.10,'PARTIAL','Invoice generated for Quotation GSS/2026/006','2026-05-25 12:10:40.093000','2026-05-25 12:11:18.835000',0.00,0.00,NULL,5.00,NULL,NULL);
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_activities`
--

DROP TABLE IF EXISTS `lead_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead_activities` (
  `id` varchar(36) NOT NULL,
  `lead_id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `lead_activities_lead_id_fkey` (`lead_id`),
  CONSTRAINT `lead_activities_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_activities`
--

LOCK TABLES `lead_activities` WRITE;
/*!40000 ALTER TABLE `lead_activities` DISABLE KEYS */;
INSERT INTO `lead_activities` VALUES ('b289181a-23a8-49ac-93f6-9809e959eb26','e09e0b5b-02ff-405d-827d-d83636ade8b8','NOTE','NOTE logged','discuss in Tuesday 26.05.26 ','2026-05-23 14:56:31.469000','2026-05-23 14:56:36.485000');
/*!40000 ALTER TABLE `lead_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_transactions`
--

DROP TABLE IF EXISTS `lead_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead_transactions` (
  `id` varchar(36) NOT NULL,
  `lead_id` varchar(36) NOT NULL,
  `date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `description` varchar(191) NOT NULL,
  `type` varchar(20) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance` decimal(15,2) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `lead_transactions_lead_id_fkey` (`lead_id`),
  CONSTRAINT `lead_transactions_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_transactions`
--

LOCK TABLES `lead_transactions` WRITE;
/*!40000 ALTER TABLE `lead_transactions` DISABLE KEYS */;
INSERT INTO `lead_transactions` VALUES ('01f20c52-3912-4750-88fd-29774bb8ccff','73ffb695-ee52-4a05-b1c1-18209e5f2373','2026-05-25 12:11:19.643000','Auto-generated: Payment recorded for Invoice against GSS/2026/006','CREDIT',200000.00,-507994.10,'2026-05-25 12:11:19.643000'),('88cb9670-e06c-425e-aae7-17fa3aca1782','73ffb695-ee52-4a05-b1c1-18209e5f2373','2026-05-25 12:10:30.796000','Auto-generated: Quotation GSS/2026/006 Accepted','DEBIT',707994.10,-707994.10,'2026-05-25 12:10:30.796000'),('db8c98b5-5418-4a59-9dad-7e77b56badc2','e09e0b5b-02ff-405d-827d-d83636ade8b8','2026-05-22 14:25:13.631000','Auto-generated: Quotation GSS/2026/002 Accepted','DEBIT',50000.00,-50000.00,'2026-05-22 14:25:13.631000');
/*!40000 ALTER TABLE `lead_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` varchar(36) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'NEW',
  `notes` varchar(191) DEFAULT NULL,
  `assigned_to` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `client_id` varchar(36) DEFAULT NULL,
  `closure_probability` int(11) DEFAULT 0,
  `next_follow_up` datetime(6) DEFAULT NULL,
  `expected_value` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `leads_client_id_fkey` (`client_id`),
  CONSTRAINT `leads_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES ('695dfcd5-3176-424e-846c-6a86de6362db','global safety','vercel','vercel@gmail.com','1234567890','Cold Call','NEW','good',NULL,'2026-05-25 08:30:06.590000','2026-05-25 08:30:06.590000',NULL,20,'2026-05-27 00:00:00.000000',20000.00),('73ffb695-ee52-4a05-b1c1-18209e5f2373','DAV','john kabir','jk@gmail.com','1239876450','Cold Call','WON','its the max',NULL,'2026-05-25 11:10:41.670000','2026-05-25 12:10:31.198000','5173b7af-073b-44e1-a703-3bc0b4c107b9',37,'2026-05-30 00:00:00.000000',707994.10),('e09e0b5b-02ff-405d-827d-d83636ade8b8','global webify ','vikram','globalwebify@gmail.com','1425626637','LinkedIn','WON','nice',NULL,'2026-05-22 12:43:21.760000','2026-05-25 08:15:21.406000','5615889d-85e6-4005-9cc0-ed84eae901ce',80,'2026-05-30 00:00:00.000000',50000.00);
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_requests`
--

DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_requests` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `leave_type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `approved_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leave_requests_approved_by_fkey` (`approved_by`),
  KEY `leave_requests_user_id_fkey` (`user_id`),
  CONSTRAINT `leave_requests_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `leave_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_requests`
--

LOCK TABLES `leave_requests` WRITE;
/*!40000 ALTER TABLE `leave_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ledger_entries`
--

DROP TABLE IF EXISTS `ledger_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ledger_entries` (
  `id` varchar(36) NOT NULL,
  `voucher_no` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `transaction_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `debit_account_id` varchar(36) NOT NULL,
  `credit_account_id` varchar(36) NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ledger_entries_voucher_no_key` (`voucher_no`),
  KEY `ledger_entries_debit_account_id_fkey` (`debit_account_id`),
  KEY `ledger_entries_credit_account_id_fkey` (`credit_account_id`),
  CONSTRAINT `ledger_entries_credit_account_id_fkey` FOREIGN KEY (`credit_account_id`) REFERENCES `accounts` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_debit_account_id_fkey` FOREIGN KEY (`debit_account_id`) REFERENCES `accounts` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ledger_entries`
--

LOCK TABLES `ledger_entries` WRITE;
/*!40000 ALTER TABLE `ledger_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `ledger_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modules_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` varchar(191) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'INFO',
  `link` varchar(191) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_fkey` (`user_id`),
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES ('009147e1-4735-4675-ade1-6c9a97f191ab','2ec59e45-e693-45ac-8b5f-af719704b15b','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:09.913000'),('04064cfa-7c2c-45b2-a3ae-fef581583e02','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:27.300000'),('06be9e55-b1c3-4fe0-a85c-d38aa76905b0','421f60ce-ab36-4d86-ba67-ccdc046ce152','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:37:55.413000'),('07c58fa4-0ccd-428d-ac7a-1bcb92b34916','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:31.508000'),('07dfb78b-9fab-4c22-942f-71345d7e6492','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:31.764000'),('093eb4cd-ba9e-4124-b206-bf61e7e684e9','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:43.067000'),('0c472b8a-3d3a-4a41-b591-2e26780674df','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 08:11:10.431000'),('0f4d0cb8-6b33-407d-9be8-087c7809646b','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',1,'2026-05-25 06:42:35.448000'),('0ff2c009-e86c-4e89-814c-5749b5fdf3ef','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:35.702000'),('10b4ef66-4d5d-44cc-8299-8b4f4f528acd','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-22 14:24:13.723000'),('12bc64cd-c4cb-4f00-a8bb-19733a3a71e9','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:02.926000'),('14193d34-d956-4a71-8bf5-f8edc11b46b1','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',1,'2026-05-27 07:05:01.848000'),('14247387-615c-4ec4-b077-d09eb9e94fe4','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-25 10:57:42.376000'),('14cd2fcb-d58c-4856-b7c0-73d22980515c','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:01.631000'),('1651e8c6-074b-4bfa-954c-95b415e2cd04','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:21:29.024000'),('19abd23d-7484-4510-8f4f-616278d7c90a','b49f655d-1d47-461b-8c1d-dc3beb948bd6','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:11.122000'),('1a54342a-628e-492a-a367-b6a93b059a00','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:13.603000'),('1a8c52d1-84ea-45e7-bc88-187d231b2de4','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/002 has been generated for 50,000 INR.','INFO','/dashboard/quotations',1,'2026-05-22 13:11:13.492000'),('1c8e992a-d7e2-4ecc-be85-96d2185af8c4','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-25 08:15:24.773000'),('1cb9044e-e83e-49a7-a9dc-0b737b1cf549','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:40.834000'),('1d2c55a1-c437-4f5d-8208-ec49fd92cce1','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:16.275000'),('1d7de572-e231-4816-a835-6c48310e7f58','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 07:48:00.877000'),('1e91101d-c73f-422b-8aec-497f8f02001b','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:27.448000'),('1f37b2a2-fcab-43e9-97ea-2aab8a8b4482','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 06:20:24.839000'),('1f548d07-fbed-45a3-8412-062bbe1db303','07c4d2f1-5e37-4b70-9024-7ad032ea1c91','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:00.660000'),('1f76da6c-6383-4fc8-bd79-edaa82439e33','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-23 15:06:57.275000'),('202660c1-f116-441b-8a76-86191d5e8720','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:06.906000'),('20a7ac22-782f-4ccc-93bb-8be4724d247f','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:08.062000'),('246be791-0ce7-4ecd-85e4-be8e691e61ea','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 07:48:01.157000'),('25d11c4d-95dc-4b73-9043-70e635835046','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:02.281000'),('27b61261-97df-4fa3-bc72-338a078a6b9e','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 08:15:25.420000'),('29a2547c-b562-4d1c-8453-4671554336c8','c852108e-1a84-42a2-a34a-9e5e4ed01d4a','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:14.852000'),('2e8f9a9a-5530-425a-b3d4-80d6b69ae35a','e013d9f9-b6dc-46fe-a797-63cb9f716860','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:38:03.609000'),('32fcbec2-55d6-47e8-b514-768c75763f3e','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:28.732000'),('33155328-2421-4d80-a3b7-e75cf80778ea','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:03.692000'),('3369377d-7731-4677-994b-6c3230075bb7','57b706ad-5123-4f1e-8590-e91beb947e7d','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:37:56.264000'),('3386ba00-def8-4bd7-82ac-a66eba60510f','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 08:11:11.206000'),('34e87399-0484-48ef-b0b6-606d41013578','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 07:46:04.230000'),('350bdb1a-edf0-4691-b955-925b5642fc5c','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:04.876000'),('3b7ecdfc-869b-4afc-bcdd-8ce750b1a52b','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:31.456000'),('3b88fef8-ee45-4e46-b85e-955d0b93c2f2','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:36.212000'),('3cbea898-e297-4581-9399-b6e3bbcacb75','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 07:46:27.963000'),('3df742a1-628e-4fd4-8594-e895c93185c3','b49f655d-1d47-461b-8c1d-dc3beb948bd6','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:38:01.268000'),('3e971b1d-cf04-4dbc-83a4-980a9efde3de','421f60ce-ab36-4d86-ba67-ccdc046ce152','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:10.878000'),('40583d48-3b44-4a56-91c6-ae9346e1771c','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:42.144000'),('406cd293-f442-4d1f-9aec-19f68f076205','e013d9f9-b6dc-46fe-a797-63cb9f716860','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:11.659000'),('423b8015-ea5f-48ed-9dc7-2c01932e3121','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:27.733000'),('4362bcf7-1397-4d1a-8c12-bf17f7563f89','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 08:15:24.558000'),('46e7bcdc-1c57-4125-907a-b28856f96a79','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-23 15:06:58.105000'),('47a4e567-c492-4f4e-8a6c-ca11a0a300a7','2ec59e45-e693-45ac-8b5f-af719704b15b','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:06.433000'),('4977eaab-1bb9-40e3-80a5-268c64f3aa36','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:35.957000'),('49a8da34-8aa8-4fda-9667-d2f1602cb978','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 08:11:10.983000'),('4b8dff77-2a92-4fa1-a707-90387a117481','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:00.983000'),('4c046b2b-1348-4903-bc65-b8b44574320f','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:07.292000'),('4c51ab2d-9e6b-4534-b162-1d2640887e41','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:21:29.244000'),('4c5aceaa-07db-4ba3-921e-db9865fad2d9','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:25.541000'),('4cee6133-32c7-4456-8c8a-3be930beefaf','349ed967-9ad6-4278-add8-80bed2b99c5e','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:37:53.306000'),('4eeb03cc-6de9-4d8e-aa3f-d41d3ae60fc9','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 07:47:59.898000'),('50dca319-2fac-46d9-9c14-73bc9555809b','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:41.510000'),('5101650b-84a6-4587-b042-2097cad0bbb4','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-23 15:06:58.348000'),('515ad86d-4cc8-46ad-8c81-abe28e4c1d66','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:07.806000'),('51f7f488-3a29-4574-8d85-9db1dcef5bdb','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:21:28.584000'),('56562f46-646a-4db4-9828-677844406319','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:25.308000'),('59d1320e-5da1-4c6a-b7bb-c96e75b2f399','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 08:11:10.763000'),('5afdae02-b8b8-4366-97b6-c60e99a17f1e','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:31.102000'),('5cd7b0dc-9403-4df1-a116-34ec6ef88e1e','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:42.606000'),('5f03004f-b5c0-4f77-afde-3eb3a568d93d','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:30.481000'),('61d84098-b3b2-474e-adca-90e950273e3c','421f60ce-ab36-4d86-ba67-ccdc046ce152','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:01.417000'),('67fd7fcf-da15-4ef4-839b-d778a8483cc3','57b706ad-5123-4f1e-8590-e91beb947e7d','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:10.585000'),('683817ae-6eff-42c7-9a1a-625304a96408','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:04.662000'),('6b383d60-5369-4659-aaaa-ef5adb696a9b','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/003 has been generated for 4,720 INR.','INFO','/dashboard/quotations',1,'2026-05-22 14:07:05.985000'),('6cb16f39-4b0c-460f-91c2-5377c4cdd10b','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 08:15:24.989000'),('6deb0cba-613d-4dcc-a3dc-7df85b1f0ec5','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:42.048000'),('718a8544-eba3-4710-b881-86f8af9fca16','349ed967-9ad6-4278-add8-80bed2b99c5e','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:10.485000'),('75299c6b-7a9a-4068-92f5-bcb0cb44f5c3','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:02.497000'),('75400bb7-4e10-4408-ab5b-f715edda8190','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:32.165000'),('7bf6f39a-539c-4f56-9eea-2bbcf998f91a','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:32.401000'),('7cbde818-5d2f-4577-8547-cd2a14d77dea','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-06-11 09:42:11.662000'),('7f061d79-2574-4c03-9dba-4f24cc196948','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:25.073000'),('7fec8261-a9e1-4b10-8d8b-fd6a2dbd8b98','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 07:46:07.548000'),('80069787-703b-4487-9d03-2d9bf8e6a7ab','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/001 has been generated for 50,000 INR.','INFO','/dashboard/quotations',1,'2026-05-22 13:11:08.524000'),('80bfeedf-6bcc-4777-9d06-578c1cf40949','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:24.254000'),('811da6dc-5250-411c-9e3b-0decc9bd5627','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:11.312000'),('864f3b35-9d0d-4189-b8ba-41ff95685968','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 08:15:24.234000'),('8686bd30-f037-4c4b-bdbc-4c03ab828a74','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 07:46:30.995000'),('89545924-bda4-48f3-a09f-86625a5461aa','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-25 12:10:41.779000'),('8aa2c3ae-b85b-46e6-94c0-2c58127dd723','349ed967-9ad6-4278-add8-80bed2b99c5e','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:01.201000'),('8ac53e42-e0e7-45ab-8839-cf46ec5f6950','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:04.446000'),('8b210d27-a20e-40aa-9c60-ca936ce7899f','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',1,'2026-05-23 10:53:37.000000'),('916ea8c2-e625-4af2-99d0-12d11f2ba002','57b706ad-5123-4f1e-8590-e91beb947e7d','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:37.769000'),('9260cc74-6688-4db9-ac65-0a4e8de1e959','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:42.316000'),('93a8be2f-ed86-47c0-b89b-f6c7001c2b9c','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:26.541000'),('94365ce3-b0a7-4e33-9965-7e1731ec507f','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:41.568000'),('956a8fa7-3903-477b-970e-b01a4965624a','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:12.346000'),('969d348f-2a9f-4820-9105-dacd7566dad1','2ec59e45-e693-45ac-8b5f-af719704b15b','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:37:50.351000'),('96ecf010-9721-40b8-aa4d-e7a0a5488182','c2830a86-9d1d-42e5-8180-81ec39c45414','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',0,'2026-05-23 10:53:37.473000'),('97a1d0be-12e6-47f8-bb76-d739f8bc12bc','2ec59e45-e693-45ac-8b5f-af719704b15b','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',0,'2026-05-23 10:53:36.408000'),('9e3f5755-4adc-43b0-afe9-b6b9fe64495d','2ec59e45-e693-45ac-8b5f-af719704b15b','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:37.211000'),('9faf145c-c9e5-4fe0-b4e8-1655abc2b023','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:26.866000'),('a068b673-827e-43ff-9482-f39d44ee7b18','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:30.737000'),('a1c32bd4-1052-45b7-b07b-4b4afebc026b','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:24.604000'),('a2037c51-a83e-46ca-b3f0-0584332d21df','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:21:28.254000'),('a382b025-ac1e-4076-9818-81f0c1394ff2','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:31.928000'),('a415dee1-39c7-4f63-85f0-7177dd15921e','349ed967-9ad6-4278-add8-80bed2b99c5e','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:10.316000'),('a434646b-94e3-4673-af01-0893c6c8711e','349ed967-9ad6-4278-add8-80bed2b99c5e','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:41.241000'),('a51a509e-ed1a-4ab4-ba53-760afdeff10d','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:21:29.465000'),('a5539255-b95d-4a34-8778-5510da208e4f','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:20:27.516000'),('a72fae5b-63e9-4ad0-b0db-87fef9aad2ac','e013d9f9-b6dc-46fe-a797-63cb9f716860','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:38.665000'),('a8b7a1f1-ba81-465c-b233-38511ca3e3eb','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:35.193000'),('adffeec8-59e6-4162-ac22-bcd4c5e39d8b','b49f655d-1d47-461b-8c1d-dc3beb948bd6','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:08.004000'),('af0d1873-d2db-4414-bfaf-1896b455fc07','b49f655d-1d47-461b-8c1d-dc3beb948bd6','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:38.217000'),('b1f2e1d0-20c8-465d-836a-1fe3657aaf6d','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/003 has been generated for 84,724 INR.','INFO','/dashboard/quotations',1,'2026-05-22 14:18:42.626000'),('b273d2fd-d21a-4e83-a92f-f696c12fbf62','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',1,'2026-06-05 05:04:07.480000'),('b474e714-d00a-4777-85be-f2d3236317cb','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',1,'2026-05-25 06:42:31.693000'),('b550b9c6-3565-4872-8b75-646a543fdb7e','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-23 15:06:58.587000'),('b61066b4-2142-4b12-8432-f009490f6ca3','2ec59e45-e693-45ac-8b5f-af719704b15b','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:09.563000'),('b89e02b6-6776-40e7-ba3c-81e8c76721f6','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/002 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 08:15:25.204000'),('b96f8c5e-db75-4ba9-9359-00ff9235106c','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:08.319000'),('b9897fb1-6f06-4850-a03c-86ac109b3aa4','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 08:11:11.427000'),('b9ec57dd-b005-4036-937c-0d906a7ab8a3','07c4d2f1-5e37-4b70-9024-7ad032ea1c91','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:06.042000'),('bc8fdf04-3fea-494e-84af-fab719301a41','349ed967-9ad6-4278-add8-80bed2b99c5e','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:06.695000'),('bda9abdd-51b4-4b63-a95f-609d6b5817ee','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:28.220000'),('bdf5fdb9-8df8-4f7d-afcf-7550c8e01a1f','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',1,'2026-05-25 12:10:10.854000'),('be3ebc5d-e036-47b6-9e02-d579ddb427e2','c2830a86-9d1d-42e5-8180-81ec39c45414','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:42.837000'),('c08a94e6-61c6-40e8-bea9-77bc5c4dca67','b49f655d-1d47-461b-8c1d-dc3beb948bd6','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:31.251000'),('c5e9fcaa-8d47-401f-afcd-a6d62857e684','87e58994-9d13-4d65-b797-0dd7063bbc47','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:38:00.156000'),('c71997f9-07e4-4bfd-8de5-82d3bc2c607c','c852108e-1a84-42a2-a34a-9e5e4ed01d4a','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',0,'2026-05-27 07:05:02.712000'),('c9b02013-60e1-4d1a-83d6-644d96c0f6bc','e013d9f9-b6dc-46fe-a797-63cb9f716860','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',0,'2026-05-23 10:53:37.710000'),('cb193f4b-25e6-489d-8b24-e3f51c8608c2','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:04.015000'),('cd3b69fd-5345-4ea3-8191-5856e449c49b','87e58994-9d13-4d65-b797-0dd7063bbc47','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:11.997000'),('cd8b2b34-4d84-495f-9c76-f7ca01421593','07c4d2f1-5e37-4b70-9024-7ad032ea1c91','Sales Conversion Success','Quotation GSS/2026/008 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-06-11 09:42:08.151000'),('ce43d028-5b2c-454f-af71-7b103611b07a','c852108e-1a84-42a2-a34a-9e5e4ed01d4a','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:38:03.036000'),('ce8ae3bf-c9b0-4c90-928b-c232086b44d5','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-25 07:48:00.598000'),('d112a8df-39c5-4a49-ac78-dc13749c94fb','c2830a86-9d1d-42e5-8180-81ec39c45414','New Quotation Created','Quotation GSS/2026/006 has been generated for 707,994.1 INR.','INFO','/dashboard/quotations',0,'2026-05-25 12:10:11.391000'),('d2ef2f9f-5824-4573-b3cb-b441060ea7c3','57b706ad-5123-4f1e-8590-e91beb947e7d','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:07.220000'),('d5867952-af83-4e30-bc63-5270e87556dd','2ec59e45-e693-45ac-8b5f-af719704b15b','Inspection Completed','Engineer Super Admin completed inspection for nayan enterprises.','SUCCESS','/dashboard/inspections',0,'2026-05-25 06:42:34.812000'),('d7b6ec8b-09bf-4073-99bc-8d2cbc153148','c2830a86-9d1d-42e5-8180-81ec39c45414','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:38.441000'),('daad1df1-4c15-4405-84f3-67762314298f','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 06:21:28.803000'),('dee1f801-8350-40ae-a2e6-8e4a5fbe2450','c2830a86-9d1d-42e5-8180-81ec39c45414','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:08.266000'),('e0121c72-0f01-4398-9b6f-e6d617187a50','57b706ad-5123-4f1e-8590-e91beb947e7d','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:27.706000'),('e04b661d-c74c-4a47-9429-ba75268a86ac','e013d9f9-b6dc-46fe-a797-63cb9f716860','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:08.791000'),('e117b606-259d-4121-bc76-2dd51e88d26b','349ed967-9ad6-4278-add8-80bed2b99c5e','Sales Conversion Success','Quotation GSS/2026/005 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 10:57:41.914000'),('e260ce7e-9182-40e3-b60d-59b584420a4e','c852108e-1a84-42a2-a34a-9e5e4ed01d4a','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:08.530000'),('e35dcbce-4119-4d6c-a612-aad77fc0860c','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',1,'2026-05-25 10:56:37.994000'),('e4a1a4d8-6939-49e7-adbd-07bc57e2b60a','b49f655d-1d47-461b-8c1d-dc3beb948bd6','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',0,'2026-05-23 10:53:37.237000'),('e58f563c-cc39-46c5-bf43-7f84f37049d8','349ed967-9ad6-4278-add8-80bed2b99c5e','New Quotation Created','Quotation GSS/2026/005 has been generated for 336,300 INR.','INFO','/dashboard/quotations',0,'2026-05-25 10:56:37.547000'),('e94cf40c-c3cf-49f6-9c71-b535fdb61c5f','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 07:48:01.437000'),('ea0e5cdd-c1be-4579-aef0-a7b84fe40c5b','63b9ffd4-0526-47f7-ae5a-565625197370','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',1,'2026-05-23 15:06:57.867000'),('ec1ce37c-08a5-4924-800d-cf775fd84096','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/003 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-23 15:06:57.630000'),('ec2173d3-ca6c-41bb-a6fd-015bd306fe5c','e013d9f9-b6dc-46fe-a797-63cb9f716860','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 08:11:11.649000'),('ec92807e-1347-4e79-9feb-c7a1f3b607cd','c2830a86-9d1d-42e5-8180-81ec39c45414','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:38:02.181000'),('ecaf01ca-7d2c-48df-8564-5ff247f527c5','07c4d2f1-5e37-4b70-9024-7ad032ea1c91','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',0,'2026-06-11 09:37:47.224000'),('ef94b39e-0f97-4b0d-9cbe-3ceb07f7c754','63b9ffd4-0526-47f7-ae5a-565625197370','Inspection Completed','Engineer ASHOK KUMAR completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',1,'2026-05-25 06:20:27.083000'),('eff6593e-5ed3-4e08-a661-675db47b417f','57b706ad-5123-4f1e-8590-e91beb947e7d','Sales Conversion Success','Quotation GSS/2026/004 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 07:48:00.319000'),('f31956be-4697-40d9-88ce-b60cf857fde7','87e58994-9d13-4d65-b797-0dd7063bbc47','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',1,'2026-06-05 05:04:07.743000'),('f613ea31-d25a-4915-b54a-f2c179ac6cfc','63b9ffd4-0526-47f7-ae5a-565625197370','New Quotation Created','Quotation GSS/2026/008 has been generated for 17,700 INR.','INFO','/dashboard/quotations',1,'2026-06-11 09:37:58.145000'),('fb1c95c0-c52e-458a-ac3e-7d067fe59e09','87e58994-9d13-4d65-b797-0dd7063bbc47','Inspection Completed','Engineer karan completed inspection for DAV.','SUCCESS','/dashboard/inspections',1,'2026-05-27 07:05:02.066000'),('fd030adf-7842-42c0-a29b-a9f6f91b934b','421f60ce-ab36-4d86-ba67-ccdc046ce152','New Quotation Created','Quotation GSS/2026/007 has been generated for 414,180 INR.','INFO','/dashboard/quotations',0,'2026-06-05 05:04:06.958000'),('fdafdabb-d95b-4487-bb4e-aa4d054b6ff4','57b706ad-5123-4f1e-8590-e91beb947e7d','New Quotation Created','Quotation GSS/2026/004 has been generated for 4,035,600 INR.','INFO','/dashboard/quotations',0,'2026-05-23 10:53:36.762000'),('fdeeb853-c2e1-4948-914e-98cfca46b862','c2830a86-9d1d-42e5-8180-81ec39c45414','Inspection Completed','Engineer MD KAMRAN completed inspection for ITC  LIMITED.','SUCCESS','/dashboard/inspections',0,'2026-05-25 07:46:28.476000'),('ff7e0715-5ed6-4797-8fb6-72d5cb439e42','e013d9f9-b6dc-46fe-a797-63cb9f716860','Sales Conversion Success','Quotation GSS/2026/006 was accepted and converted to Project and Invoice.','SUCCESS','/dashboard/finance',0,'2026-05-25 12:10:42.587000');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `payment_method` varchar(50) NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'COMPLETED',
  `notes` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `payments_invoice_id_fkey` (`invoice_id`),
  CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES ('1068cf17-2589-4200-a342-35bc8a767f3a','15fe9365-be8a-4ee1-abf5-3d2a6201a91b',100000.00,'2026-05-25 11:50:18.374000','BANK_TRANSFER','ljbxb938bhhjdjd','COMPLETED','partial','2026-05-25 11:50:18.374000'),('4af05bc7-4c7c-426f-af16-cb2de3c35ca0','15fe9365-be8a-4ee1-abf5-3d2a6201a91b',236300.00,'2026-05-25 12:08:35.053000','BANK_TRANSFER','jsxjbsjbs','COMPLETED','completed','2026-05-25 12:08:35.053000'),('891cf6b4-d4eb-4dd6-a735-3100985a136a','eb844b0d-3c9f-470f-a092-6624e0757035',200000.00,'2026-05-25 12:11:18.433000','BANK_TRANSFER','hxusbxhvsx','COMPLETED','partial\n','2026-05-25 12:11:18.433000'),('b5297498-a050-4d0a-b90e-e75b5a1c457d','15fe9365-be8a-4ee1-abf5-3d2a6201a91b',236300.00,'2026-05-25 12:08:35.466000','BANK_TRANSFER','jsxjbsjbs','COMPLETED','completed','2026-05-25 12:08:35.466000');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_records`
--

DROP TABLE IF EXISTS `payroll_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll_records` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `base_salary` decimal(12,2) NOT NULL,
  `bonus` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_pay` decimal(12,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PROCESSING',
  `paid_at` datetime(6) DEFAULT NULL,
  `remarks` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_records_user_id_month_year_key` (`user_id`,`month`,`year`),
  CONSTRAINT `payroll_records_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_records`
--

LOCK TABLES `payroll_records` WRITE;
/*!40000 ALTER TABLE `payroll_records` DISABLE KEYS */;
INSERT INTO `payroll_records` VALUES ('17293492-0e43-46a4-b67a-748484e0fdc8','b49f655d-1d47-461b-8c1d-dc3beb948bd6',5,2026,30000.00,0.00,0.00,30000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:01:38.142000'),('4f90dc36-2c4a-484f-8249-b472bfb2c974','b49f655d-1d47-461b-8c1d-dc3beb948bd6',4,2026,30000.00,0.00,0.00,30000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:03:47.863000'),('729ed85f-8e48-4456-a07c-d953237d56cc','c2830a86-9d1d-42e5-8180-81ec39c45414',4,2026,420000.00,0.00,0.00,420000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:03:48.134000'),('993dc323-d5e7-4ffb-be8b-0306d3668f4d','c2830a86-9d1d-42e5-8180-81ec39c45414',5,2026,420000.00,0.00,0.00,420000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:01:38.423000'),('ac785103-a597-47ef-95ec-0f0d7980f9f1','57b706ad-5123-4f1e-8590-e91beb947e7d',4,2026,45000.00,0.00,0.00,45000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:03:47.593000'),('c8a1b239-ab02-4c89-be71-b5a91dfd7452','2ec59e45-e693-45ac-8b5f-af719704b15b',4,2026,25000.00,0.00,0.00,25000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:03:47.164000'),('d698d737-376a-400a-8257-f9a6b3bfa72d','e013d9f9-b6dc-46fe-a797-63cb9f716860',4,2026,42000.00,0.00,0.00,42000.00,'PAID','2026-05-22 15:03:53.581000',NULL,'2026-05-22 15:03:48.405000'),('e3559fca-f371-4080-94e6-1bb20f5c377e','57b706ad-5123-4f1e-8590-e91beb947e7d',5,2026,45000.00,0.00,0.00,45000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:01:37.860000'),('e5316939-5b58-497d-ad84-20f77522bb6f','e013d9f9-b6dc-46fe-a797-63cb9f716860',5,2026,42000.00,0.00,0.00,42000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:01:38.705000'),('f2c7e224-ed6e-44bb-8d83-8c9ddfdaa243','2ec59e45-e693-45ac-8b5f-af719704b15b',5,2026,25000.00,0.00,0.00,25000.00,'PROCESSING',NULL,NULL,'2026-05-22 15:01:37.408000');
/*!40000 ALTER TABLE `payroll_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `module` varchar(100) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('10591d12-77da-4abc-a12d-677bc1f6130d','VIEW_CLIENTS','View client list and details','CLIENTS','2026-05-16 10:39:41.170000','2026-06-15 06:38:13.973000'),('19266161-56b1-4cee-8862-c340e71daf6b','MANAGE_INVOICES','Create and send invoices','FINANCE','2026-05-16 10:39:41.214000','2026-06-15 06:38:16.370000'),('1dacc9c6-9750-4b27-a1e6-e4f4889cf598','VIEW_PAYROLL','View payroll history','HR','2026-05-16 10:39:41.233000','2026-06-15 06:38:17.738000'),('3115de26-5f80-4368-aa1e-fa614633f2f4','VIEW_INVOICES','View invoices','FINANCE','2026-05-16 10:39:41.208000','2026-06-15 06:38:16.029000'),('31fc1d94-0ce0-4eca-bd60-5ac4a2391452','MANAGE_PAYMENTS','Record and manage payments','FINANCE','2026-05-16 10:39:41.219000','2026-06-15 06:38:16.712000'),('386f620c-6446-496d-8e68-ed7ddfc1f145','VIEW_PROJECTS','View projects','OPERATIONS','2026-05-16 10:39:41.242000','2026-06-15 06:38:18.423000'),('634c8d9d-0bc1-4284-8c6c-d43e67b62130','MANAGE_ROLES','Manage roles and permissions','SYSTEM','2026-05-16 10:39:41.303000','2026-06-15 06:38:20.818000'),('679f423b-d1f1-4090-8683-6fc975916519','MANAGE_QUOTATIONS','Create and approve quotations','SALES','2026-05-16 10:39:41.203000','2026-06-15 06:38:15.686000'),('6e5f6bfe-ec27-485f-8a46-69d42cf90371','VIEW_LEADS','View sales leads','SALES','2026-05-16 10:39:41.185000','2026-06-15 06:38:14.658000'),('8005646d-577e-471d-baeb-cbb5b5f31a23','VIEW_COMPLIANCE','View compliance status','COMPLIANCE','2026-05-16 10:39:41.289000','2026-06-15 06:38:19.792000'),('859c17ca-4734-485a-82be-43468303dba0','MANAGE_PROJECTS','Manage project lifecycle','OPERATIONS','2026-05-16 10:39:41.248000','2026-06-15 06:38:18.765000'),('93492341-e927-45f0-bd5b-35a51111cc92','MANAGE_STAFF','Onboard and manage employee profiles','HR','2026-05-16 10:39:41.228000','2026-06-15 06:38:17.396000'),('95b6ffce-af17-4477-9c2c-55daa5382142','MANAGE_CLIENTS','Create, update and delete clients','CLIENTS','2026-05-16 10:39:41.179000','2026-06-15 06:38:14.316000'),('99bf2ee0-5afb-4a2c-ab09-472b7dd07cae','VIEW_DASHBOARD','Access to main dashboard','DASHBOARD','2026-05-16 10:39:41.155000','2026-06-15 06:38:13.424000'),('9d0b338e-67cf-4cbe-84dc-714510637f97','MANAGE_COMPLIANCE','Manage compliance certificates and renewals','COMPLIANCE','2026-05-16 10:39:41.295000','2026-06-15 06:38:20.133000'),('a9216539-72ea-413e-b053-ca9bd65f405f','VIEW_STAFF','View employee directory','HR','2026-05-16 10:39:41.223000','2026-06-15 06:38:17.053000'),('b21f7e2b-5b0c-4dfb-add7-8e48a3cf83b7','MANAGE_SYSTEM_SETTINGS','Change organization and system settings','SYSTEM','2026-05-16 10:39:41.299000','2026-06-15 06:38:20.475000'),('bedbaab8-0f40-401d-8583-058b0904f3b1','VIEW_QUOTATIONS','View quotations','SALES','2026-05-16 10:39:41.198000','2026-06-15 06:38:15.343000'),('c1e98361-6eec-4da0-8bf7-62bc8ee8222f','MANAGE_LEADS','Manage leads pipeline','SALES','2026-05-16 10:39:41.190000','2026-06-15 06:38:15.000000'),('cc8ae855-9a36-475a-9bda-eac3d5b40dd2','MANAGE_INSPECTIONS','Schedule and complete inspections','OPERATIONS','2026-05-16 10:39:41.284000','2026-06-15 06:38:19.449000'),('d700ddf0-5d81-44b6-bc8d-f90722087a61','VIEW_INSPECTIONS','View site inspections','OPERATIONS','2026-05-16 10:39:41.277000','2026-06-15 06:38:19.106000'),('e3f13ef0-d078-4130-9608-93d4c0bf56f3','MANAGE_PAYROLL','Generate and process payroll batches','HR','2026-05-16 10:39:41.237000','2026-06-15 06:38:18.080000');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `projects_client_id_fkey` (`client_id`),
  CONSTRAINT `projects_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('4117b8dc-90df-4306-8d88-10b5c160ff21','5615889d-85e6-4005-9cc0-ed84eae901ce','Project: GSS/2026/002','Automatically created from Quotation GSS/2026/002. Auto-generated quick quote based on lead expectations.',NULL,NULL,'PENDING','2026-05-25 08:15:22.481000','2026-05-25 08:15:22.481000'),('5b9c8fc4-355d-4e10-811b-d7df5373c7c5','eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','Project: GSS/2026/005','Automatically created from Quotation GSS/2026/005. bring it as soon as possible students exams are near ',NULL,NULL,'PENDING','2026-05-25 10:57:40.093000','2026-05-25 10:57:40.093000'),('75f258b4-a717-43fb-a708-ffa71eea101a','5173b7af-073b-44e1-a703-3bc0b4c107b9','DAV','we have to process the Smart board as soon as possible',NULL,NULL,'ONGOING','2026-05-25 11:27:01.665000','2026-05-25 11:27:01.665000'),('7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','6a04c499-04d4-4225-a02f-7f8f8ff7a428','Project: GSS/2026/003','Automatically created from Quotation GSS/2026/003. ',NULL,NULL,'PENDING','2026-05-22 14:24:11.520000','2026-05-22 14:24:11.520000'),('84d062e6-6fc1-40c3-a50a-59952e9e1966','6a04c499-04d4-4225-a02f-7f8f8ff7a428','Project: GSS/2026/003','Automatically created from Quotation GSS/2026/003. ',NULL,NULL,'PENDING','2026-05-23 15:06:55.022000','2026-05-23 15:06:55.022000'),('eded151f-5250-40e5-85c5-fc428f41b2c7','5173b7af-073b-44e1-a703-3bc0b4c107b9','Project: GSS/2026/006','Automatically created from Quotation GSS/2026/006. urgent ',NULL,NULL,'PENDING','2026-05-25 12:10:39.079000','2026-05-25 12:10:39.079000'),('f77ebbb3-f3ec-4ad0-80d6-8893ae897098','6a04c499-04d4-4225-a02f-7f8f8ff7a428','Project: GSS/2026/004','Automatically created from Quotation GSS/2026/004. ',NULL,NULL,'PENDING','2026-05-25 07:47:58.150000','2026-05-25 07:47:58.150000');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` varchar(36) NOT NULL,
  `po_number` varchar(100) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `po_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `total_amount` decimal(15,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_po_number_key` (`po_number`),
  KEY `purchase_orders_vendor_id_fkey` (`vendor_id`),
  CONSTRAINT `purchase_orders_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotations` (
  `id` varchar(36) NOT NULL,
  `lead_id` varchar(36) DEFAULT NULL,
  `client_id` varchar(36) DEFAULT NULL,
  `quote_number` varchar(50) NOT NULL,
  `date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `valid_until` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cgst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `sgst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `igst` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` varchar(50) NOT NULL DEFAULT 'DRAFT',
  `notes` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotations_quote_number_key` (`quote_number`),
  KEY `quotations_lead_id_fkey` (`lead_id`),
  KEY `quotations_client_id_fkey` (`client_id`),
  CONSTRAINT `quotations_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `quotations_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES ('096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'6a04c499-04d4-4225-a02f-7f8f8ff7a428','GSS/2026/003','2026-05-22 14:18:41.837000',NULL,71800.00,84724.00,12924.00,6462.00,6462.00,0.00,'ACCEPTED','','2026-05-22 14:18:41.837000','2026-05-23 15:06:54.677000',0.00),('1ed972bb-d078-4b46-be4d-ae9ecbbb20a8','e09e0b5b-02ff-405d-827d-d83636ade8b8','5615889d-85e6-4005-9cc0-ed84eae901ce','GSS/2026/002','2026-05-22 13:11:12.677000',NULL,50000.00,50000.00,0.00,0.00,0.00,0.00,'ACCEPTED','Auto-generated quick quote based on lead expectations.','2026-05-22 13:11:12.677000','2026-05-25 08:15:22.241000',0.00),('30bead19-493d-4bd8-8d78-862574b303fb','73ffb695-ee52-4a05-b1c1-18209e5f2373',NULL,'GSS/2026/006','2026-05-25 12:10:08.297000',NULL,600000.00,707994.10,107999.10,53999.55,53999.55,0.00,'ACCEPTED','urgent ','2026-05-25 12:10:08.297000','2026-05-25 12:10:38.740000',5.00),('6ac97714-70be-4bee-97ca-8a4361476bbd',NULL,'e19c5d7b-ee9e-4c8c-a55b-6e6b1ff2a0d5','GSS/2026/007','2026-06-05 05:04:05.122000',NULL,390000.00,414180.00,63180.00,31590.00,31590.00,0.00,'DRAFT','Validity: 30 days\npayment terms: 50% advance and 50% after submission of soft copy.\nArrangement: 1 labour, guest house.\nTravelling: 2000 per visit.','2026-06-05 05:04:05.122000','2026-06-05 05:04:05.122000',39000.00),('821923a6-4e51-4f0e-b676-5c7231fee070',NULL,'6a04c499-04d4-4225-a02f-7f8f8ff7a428','GSS/2026/004','2026-05-23 10:53:35.548000',NULL,3600000.00,4035600.00,615600.00,307800.00,307800.00,0.00,'ACCEPTED','','2026-05-23 10:53:35.548000','2026-05-25 07:47:57.818000',180000.00),('c19a1750-a6d3-4342-8a75-0f723a9e9e4d',NULL,'eb6fbbcd-3e36-4ad4-b940-02a4cc0f39aa','GSS/2026/005','2026-05-25 10:56:36.422000',NULL,300000.00,336300.00,51300.00,25650.00,25650.00,0.00,'ACCEPTED','bring it as soon as possible students exams are near ','2026-05-25 10:56:36.422000','2026-05-25 10:57:39.754000',15000.00);
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_items`
--

DROP TABLE IF EXISTS `quote_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_items` (
  `id` varchar(36) NOT NULL,
  `quotation_id` varchar(36) NOT NULL,
  `description` varchar(191) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `quote_items_quotation_id_fkey` (`quotation_id`),
  CONSTRAINT `quote_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_items`
--

LOCK TABLES `quote_items` WRITE;
/*!40000 ALTER TABLE `quote_items` DISABLE KEYS */;
INSERT INTO `quote_items` VALUES ('109f4bdc-b456-4155-b5ff-5779c1c1e5cb','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba','PASSANGER LIFT TESTING AND CERTIFICATION',2,2000.00,4000.00),('1a87ea52-cb5e-4ad7-880e-c9689064cbef','6ac97714-70be-4bee-97ca-8a4361476bbd','safety audit',1,80000.00,80000.00),('42a8c6fb-8d9d-4d37-8cca-0a1a4456003a','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba','AMMONIA PIPELINE TESTING',12,2700.00,32400.00),('44046718-9158-4d32-a29d-490e06eccce7','6ac97714-70be-4bee-97ca-8a4361476bbd','Map preparation',1,60000.00,60000.00),('4c10264c-c64d-43d9-a142-043bd3e0db3d','c19a1750-a6d3-4342-8a75-0f723a9e9e4d','smart board',10,30000.00,300000.00),('53984aee-3e4e-40e6-a829-db88fb8e8e67','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba','GOODS LIFT/LOADER TESTING AND CERTIFICATION',2,1500.00,3000.00),('6038d5bf-d18a-4d2f-95f9-4fdcd4249c37','821923a6-4e51-4f0e-b676-5c7231fee070','Shoes',120,30000.00,3600000.00),('659f10b2-95f8-4422-a268-ef98e10d31f1','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',12,2700.00,32400.00),('6cc65af3-d605-40af-9e3e-cfa228982eb8','30bead19-493d-4bd8-8d78-862574b303fb','smart tv',20,30000.00,600000.00),('8520b661-135d-47d3-9be6-cb9b3827f16e','1ed972bb-d078-4b46-be4d-ae9ecbbb20a8','Custom Proposal for global webify ',1,50000.00,50000.00),('e184fda5-fae9-47f7-bb5f-f5744528b298','6ac97714-70be-4bee-97ca-8a4361476bbd','Building stbility test',1,250000.00,250000.00);
/*!40000 ALTER TABLE `quote_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reminders`
--

DROP TABLE IF EXISTS `reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reminders` (
  `id` varchar(36) NOT NULL,
  `reference_type` varchar(100) NOT NULL,
  `reference_id` varchar(36) NOT NULL,
  `reminder_date` date NOT NULL,
  `reminder_for_days` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reminders`
--

LOCK TABLES `reminders` WRITE;
/*!40000 ALTER TABLE `reminders` DISABLE KEYS */;
/*!40000 ALTER TABLE `reminders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` varchar(36) NOT NULL,
  `permission_id` varchar(36) NOT NULL,
  `assigned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_fkey` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES ('b1bf1a32-a4c7-4acb-8554-cd814ca52cda','b21f7e2b-5b0c-4dfb-add7-8e48a3cf83b7','2026-06-15 06:42:13.998000');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('0e04f8ca-1489-47d6-8822-5135747845e4','SALES_EXECUTIVE','Manage leads and generate quotations.','2026-05-16 10:39:41.326000','2026-06-15 06:38:22.391000'),('2adae2b4-065d-4ecd-803b-515adfb6eff3','FIELD_ENGINEER','Perform site inspections and upload safety reports.','2026-05-16 10:39:41.321000','2026-06-15 06:38:22.049000'),('b1bf1a32-a4c7-4acb-8554-cd814ca52cda','HR_MANAGER','Manage employee lifecycle, attendance, and payroll.','2026-05-16 10:39:41.317000','2026-06-15 06:38:21.707000'),('bd83eba0-b8db-4b9b-9065-8646605aff22','CLIENT','Access to project reports, invoices, and certificates.','2026-05-16 10:39:41.332000','2026-06-15 06:38:22.733000'),('ea792887-8e4e-4559-98fd-c759767bab80','SUPER_ADMIN','Complete system access with authority to manage roles and organization settings.','2026-05-16 10:39:41.308000','2026-06-15 06:38:21.161000');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_history`
--

DROP TABLE IF EXISTS `salary_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_history` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `effective_date` date NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `salary_history_user_id_fkey` (`user_id`),
  CONSTRAINT `salary_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_history`
--

LOCK TABLES `salary_history` WRITE;
/*!40000 ALTER TABLE `salary_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_products`
--

DROP TABLE IF EXISTS `service_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_products` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_products`
--

LOCK TABLES `service_products` WRITE;
/*!40000 ALTER TABLE `service_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock` (
  `id` varchar(36) NOT NULL,
  `equipment_id` varchar(36) NOT NULL,
  `warehouse_id` varchar(36) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `min_quantity` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'IN_STOCK',
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stock_equipment_id_warehouse_id_key` (`equipment_id`,`warehouse_id`),
  KEY `stock_warehouse_id_fkey` (`warehouse_id`),
  CONSTRAINT `stock_equipment_id_fkey` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_transactions`
--

DROP TABLE IF EXISTS `stock_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_transactions` (
  `id` varchar(36) NOT NULL,
  `item_id` varchar(36) NOT NULL,
  `transaction_type` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reference_id` varchar(36) DEFAULT NULL,
  `performed_by` varchar(36) DEFAULT NULL,
  `remarks` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `stock_transactions_item_id_fkey` (`item_id`),
  CONSTRAINT `stock_transactions_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_transactions`
--

LOCK TABLES `stock_transactions` WRITE;
/*!40000 ALTER TABLE `stock_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `body` text DEFAULT NULL,
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_logs`
--

LOCK TABLES `system_logs` WRITE;
/*!40000 ALTER TABLE `system_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` varchar(36) NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` varchar(191) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `description` varchar(191) DEFAULT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `assigned_to` varchar(36) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `priority` varchar(50) NOT NULL DEFAULT 'MEDIUM',
  `status` varchar(50) NOT NULL DEFAULT 'TODO',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_assigned_to_fkey` (`assigned_to`),
  KEY `tasks_project_id_fkey` (`project_id`),
  CONSTRAINT `tasks_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES ('0a1b3c59-ff79-4c06-b61f-a3c1fbfd1326','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','PASSANGER LIFT TESTING AND CERTIFICATION','Task for PASSANGER LIFT TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','TODO','2026-05-22 14:24:11.520000','2026-05-22 14:24:11.520000'),('13dfa3a6-5e19-4f9f-9fc7-a70a590bcb18','4117b8dc-90df-4306-8d88-10b5c160ff21','IOCL BARAUNI TERMINAL UT WORK','','b49f655d-1d47-461b-8c1d-dc3beb948bd6','2026-06-04','MEDIUM','TODO','2026-05-25 08:40:54.711000','2026-05-25 08:40:54.711000'),('325382ab-cb65-44a8-8cf8-1bda117b3bc2','75f258b4-a717-43fb-a708-ffa71eea101a','fit the smart board','','349ed967-9ad6-4278-add8-80bed2b99c5e','2026-05-30','MEDIUM','TODO','2026-05-25 11:27:49.805000','2026-05-25 11:27:49.805000'),('41c530e4-ec59-46c9-9c52-bcdeaeec5565','84d062e6-6fc1-40c3-a50a-59952e9e1966','PASSANGER LIFT TESTING AND CERTIFICATION','Task for PASSANGER LIFT TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','TODO','2026-05-23 15:06:55.022000','2026-05-23 15:06:55.022000'),('47d08c3f-9d3c-49f1-a544-67cab7586912','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','ITC DAIRY MUNGER TOOLS & TACKLES WORKS','','c2830a86-9d1d-42e5-8180-81ec39c45414','2026-05-26','HIGH','DONE','2026-05-22 15:06:47.492000','2026-05-22 15:07:17.094000'),('5ff4f75e-169c-4678-be7b-10a06b3ca04d','84d062e6-6fc1-40c3-a50a-59952e9e1966','GOODS LIFT/LOADER TESTING AND CERTIFICATION','Task for GOODS LIFT/LOADER TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','TODO','2026-05-23 15:06:55.022000','2026-05-23 15:06:55.022000'),('627d0458-2c64-4c5d-b79d-bbbbffcafbd3','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','TOOLS & TACKLES','','e013d9f9-b6dc-46fe-a797-63cb9f716860','2026-05-27','HIGH','TODO','2026-05-22 15:08:27.061000','2026-05-22 15:08:27.061000'),('7f142f82-2ab0-4a39-ab65-b4a540267fa0','eded151f-5250-40e5-85c5-fc428f41b2c7','smart tv','Task for smart tv',NULL,NULL,'MEDIUM','TODO','2026-05-25 12:10:39.079000','2026-05-25 12:10:39.079000'),('976f3531-3ed8-4ede-8942-8487267c6135','5b9c8fc4-355d-4e10-811b-d7df5373c7c5','smart board','Task for smart board',NULL,NULL,'MEDIUM','TODO','2026-05-25 10:57:40.093000','2026-05-25 10:57:40.093000'),('a51500b1-cc2e-4597-b79e-27bb3332d1dd','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','site inspetion','','b49f655d-1d47-461b-8c1d-dc3beb948bd6','2026-06-01','MEDIUM','TODO','2026-05-25 08:40:19.961000','2026-05-25 08:40:19.961000'),('ab45c0ce-a45c-49e5-adf8-3d71142d1a15','84d062e6-6fc1-40c3-a50a-59952e9e1966','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION','Task for PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','TODO','2026-05-23 15:06:55.022000','2026-05-23 15:06:55.022000'),('d1dcc46c-e5d0-4018-9b8e-8766b5eeae33','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','GOODS LIFT/LOADER TESTING AND CERTIFICATION','Task for GOODS LIFT/LOADER TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','DONE','2026-05-22 14:24:11.520000','2026-05-22 15:17:13.257000'),('d73f72ec-bf61-4e69-a8da-e76cdd68653c','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','AMMONIA PIPELINE TESTING','Task for AMMONIA PIPELINE TESTING',NULL,NULL,'MEDIUM','DONE','2026-05-22 14:24:11.520000','2026-05-23 14:58:44.218000'),('e8fc41b9-5821-4752-bdb8-2da3d569a4d5','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION','Task for PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',NULL,NULL,'MEDIUM','DONE','2026-05-22 14:24:11.520000','2026-05-25 08:41:13.299000'),('eef94d77-c5b6-445b-8c9c-9014c1df555f','84d062e6-6fc1-40c3-a50a-59952e9e1966','AMMONIA PIPELINE TESTING','Task for AMMONIA PIPELINE TESTING',NULL,NULL,'MEDIUM','TODO','2026-05-23 15:06:55.022000','2026-05-23 15:06:55.022000'),('f5adf2df-edfe-41c1-8b69-352efd286c59','4117b8dc-90df-4306-8d88-10b5c160ff21','Custom Proposal for global webify ','Task for Custom Proposal for global webify ',NULL,NULL,'MEDIUM','TODO','2026-05-25 08:15:22.481000','2026-05-25 08:15:22.481000'),('f9c311a8-23b1-4fe5-9160-2cfb5ce6689e','f77ebbb3-f3ec-4ad0-80d6-8893ae897098','Shoes','Task for Shoes',NULL,NULL,'MEDIUM','TODO','2026-05-25 07:47:58.150000','2026-05-25 07:47:58.150000');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_feature_overrides`
--

DROP TABLE IF EXISTS `user_feature_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_feature_overrides` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `feature_id` varchar(36) NOT NULL,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_read` tinyint(1) NOT NULL DEFAULT 0,
  `can_update` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `assigned_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_feature_overrides_user_id_feature_id_key` (`user_id`,`feature_id`),
  KEY `user_feature_overrides_feature_id_fkey` (`feature_id`),
  CONSTRAINT `user_feature_overrides_feature_id_fkey` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_feature_overrides_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_feature_overrides`
--

LOCK TABLES `user_feature_overrides` WRITE;
/*!40000 ALTER TABLE `user_feature_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_feature_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` varchar(36) NOT NULL,
  `role_id` varchar(36) NOT NULL,
  `assigned_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `user_roles_role_id_fkey` (`role_id`),
  CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES ('07c4d2f1-5e37-4b70-9024-7ad032ea1c91','2adae2b4-065d-4ecd-803b-515adfb6eff3','2026-05-27 02:51:36.825000'),('421f60ce-ab36-4d86-ba67-ccdc046ce152','0e04f8ca-1489-47d6-8822-5135747845e4','2026-05-27 03:08:34.993000'),('63b9ffd4-0526-47f7-ae5a-565625197370','ea792887-8e4e-4559-98fd-c759767bab80','2026-05-16 10:39:41.340000'),('c852108e-1a84-42a2-a34a-9e5e4ed01d4a','b1bf1a32-a4c7-4acb-8554-cd814ca52cda','2026-05-26 11:19:00.795000');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `password_hash` varchar(191) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `last_login` datetime(6) DEFAULT NULL,
  `failed_login_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `join_date` date DEFAULT NULL,
  `aadhar_number` varchar(20) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `base_salary` decimal(12,2) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `esi_number` varchar(50) DEFAULT NULL,
  `leave_balance` int(11) NOT NULL DEFAULT 24,
  `pan_number` varchar(20) DEFAULT NULL,
  `pf_number` varchar(50) DEFAULT NULL,
  `is_on_hold` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  UNIQUE KEY `users_employee_id_key` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('07c4d2f1-5e37-4b70-9024-7ad032ea1c91','karan','karan@gmail.com','3214563452','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-27 02:51:36.825000','2026-06-15 06:38:26.303000','Engineering & Field Operations','FIELD ENGINEER','GSS/EMP/2026/010','2026-05-27','142387658765','unnamed road , bloc-3',12000.00,'','',NULL,24,'mhdckh8kjgs8',NULL,0),('2ec59e45-e693-45ac-8b5f-af719704b15b','NAVED ALAM','navedgss@gmail.com','8736667786','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-22 14:41:20.146000','2026-06-15 06:38:26.856000','DOCUMENT &  CERTIFICATION ','OFFICE INCHARGE','GSS/EMP/2026/005','2026-05-22','177800378001','NEAR GIRLS SCHOOL SUBHAS CHOWK RAMGARH-833472(JHARKHAND)',25000.00,'9990088777','8899770001',NULL,24,'FGHNA9881H',NULL,0),('349ed967-9ad6-4278-add8-80bed2b99c5e','Nayan Mahato','nayan@gmail.com','8102256789','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-25 10:44:43.789000','2026-06-15 06:38:27.200000','hiring','dev','GSS/EMP/2026/007','2026-05-25','8272 8882 9292','juhu beach , near plot no 13',5000.00,'amit','4357282929',NULL,24,'vxwytwfete',NULL,0),('421f60ce-ab36-4d86-ba67-ccdc046ce152','Ankit paswan','ap@gmail.com','6632156743','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-27 03:08:34.993000','2026-06-15 06:38:27.544000','Sales & CRM','SALES EXECUTIVE','GSS/EMP/2026/011','2026-05-27','123465435412','unnamed road , plot-8',32000.00,'','',NULL,24,'zussyys8ys7',NULL,0),('57b706ad-5123-4f1e-8590-e91beb947e7d','AQUEEL AHMAD','aqueelgss@gmail.com','8899900567','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-22 14:43:36.744000','2026-06-15 06:38:27.888000','CIVIL','COMPETENT PERSON (CIVIL)','GSS/EMP/2026/006','2026-05-22','112778008713','NEAR  RELIANCE FRESH KANKE RANCHI-834008(JHARKHAND)',45000.00,'8899000038','8822340009',NULL,24,'BHILA7498H',NULL,0),('63b9ffd4-0526-47f7-ae5a-565625197370','Super Admin','admin@globalsafety.com',NULL,'$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,1,NULL,0,NULL,'2026-05-16 10:39:41.129000','2026-06-15 06:38:28.232000',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,24,NULL,NULL,0),('87e58994-9d13-4d65-b797-0dd7063bbc47','kartik','kartik@gmail.com','3216547098','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-26 07:40:03.121000','2026-06-15 06:38:28.576000','sales','HR','GSS/EMP/2026/008','2026-05-26','728276327612','9VJF+P29\nUnnamed Road',30000.00,'','',NULL,24,'hsgfeeb7beh',NULL,0),('b49f655d-1d47-461b-8c1d-dc3beb948bd6','ASHOK KUMAR','ashok50@gmail.com','8392839281','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-22 14:34:36.744000','2026-06-15 06:38:28.919000','NDT','NDT TECHNICIAN','GSS/EMP/2026/003','2026-05-22','123456789125','BIHAR SHARIF',30000.00,'8763982738','3789461974',NULL,24,'ashok8485g',NULL,0),('c2830a86-9d1d-42e5-8180-81ec39c45414','MD KAMRAN','kmd@gmail.com','9334232423','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-22 14:32:21.844000','2026-06-15 06:38:29.265000','TPI','Senior inspection engineer','GSS/EMP/2026/002','2026-05-22','123456789674','GAYA ',420000.00,'9387907820','9383920389',NULL,24,'bikljs83940',NULL,0),('c852108e-1a84-42a2-a34a-9e5e4ed01d4a','vikram','vikram@gmail.com','1234567890','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-26 11:19:00.795000','2026-06-15 06:38:29.609000','Human Resources','HR MANAGER','GSS/EMP/2026/009','2026-05-26','123456789087','2nd Floor Ashok Nagar Rd, opposite Sai Medical',30000.00,'','',NULL,24,'hcdkhhdc87',NULL,0),('e013d9f9-b6dc-46fe-a797-63cb9f716860','MD SAMEER','sam@gmail.com','8746892678','$2b$10$kFETqFRKlb3WYTJv00tbquKcjc5wMDa0U0SNnEyickT.gmRsGaX9S',1,0,NULL,0,NULL,'2026-05-22 14:37:33.945000','2026-06-15 06:38:29.954000','INSPECTION','SITE INCHARGE','GSS/EMP/2026/004','2026-05-22','189367893648','ROAD NO-3 PURANI RANCHI, RANCHI-834001 (JHARKHAND)',42000.00,'6489721136','987622355',NULL,24,'FGHKY8762W',NULL,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_payments`
--

DROP TABLE IF EXISTS `vendor_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payments` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `expense_id` varchar(36) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `payment_method` varchar(50) NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `notes` varchar(191) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`id`),
  KEY `vendor_payments_expense_id_fkey` (`expense_id`),
  KEY `vendor_payments_vendor_id_fkey` (`vendor_id`),
  CONSTRAINT `vendor_payments_expense_id_fkey` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `vendor_payments_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_payments`
--

LOCK TABLES `vendor_payments` WRITE;
/*!40000 ALTER TABLE `vendor_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `address` varchar(191) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_items`
--

DROP TABLE IF EXISTS `work_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_items` (
  `id` varchar(36) NOT NULL,
  `work_order_id` varchar(36) NOT NULL,
  `description` text NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(15,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL DEFAULT 18.00,
  `total_amount` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `work_order_items_work_order_id_fkey` (`work_order_id`),
  CONSTRAINT `work_order_items_work_order_id_fkey` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_items`
--

LOCK TABLES `work_order_items` WRITE;
/*!40000 ALTER TABLE `work_order_items` DISABLE KEYS */;
INSERT INTO `work_order_items` VALUES ('04813d5b-64b3-4b73-92c9-4a7a5d01b639','a4f2a958-7242-4901-a815-61f7952a0dbc','GOODS LIFT/LOADER TESTING AND CERTIFICATION',2,1500.00,18.00,3000.00),('1788dfe6-a560-4fc8-8b2e-7b155bc4f63e','dd90937a-beed-4a5c-999f-d9815fb754d3','GOODS LIFT/LOADER TESTING AND CERTIFICATION',2,1500.00,18.00,3000.00),('18f4570c-e6bc-46be-bbdf-641b245b296f','be568a21-8efe-4c14-9a19-19bee15edd3c','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',12,2700.00,18.00,32400.00),('2882f142-9582-4d1a-a4e8-53c7d772fea1','e7b4265c-47ac-4809-bb87-4e9b93a23a97','Custom Proposal for global webify ',1,50000.00,18.00,50000.00),('45377c9d-767c-40c3-9fc7-2d792a3a2d56','c0f5c129-92ae-4237-ba97-cd7077c94c20','PASSANGER LIFT TESTING AND CERTIFICATION',2,2000.00,18.00,4000.00),('6cba6c57-ce40-456b-b4b1-e94cb9b150a7','5eae9895-f862-4cd8-8d25-4bbccb03b631','Shoes',120,30000.00,18.00,3600000.00),('7209cfe4-79d7-46db-a1cb-2b1ae151b760','4eeac8bd-8872-43d2-9c29-0368f3b43005','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION',12,2700.00,18.00,32400.00),('7bf44248-d56e-4a0b-b63c-673d0c6b08fc','73e4df1f-3501-451d-8831-e7b9cb30f06c','AMMONIA PIPELINE TESTING',12,2700.00,18.00,32400.00),('b0011467-a5c0-4d90-9558-98d5204e350f','958135ba-00d7-4af7-8623-6c01c246d0bd','smart board',10,30000.00,18.00,300000.00),('dc972879-7836-4320-87aa-e3c06f409d02','9eef8687-1e32-4b16-a2b5-d01d898b61fd','AMMONIA PIPELINE TESTING',12,2700.00,18.00,32400.00),('f31e6414-772b-447d-b734-fb709b6a4d08','4cbc9448-b6cc-4d32-958b-7a39bde593d3','smart tv',20,30000.00,18.00,600000.00),('f9dd1e62-e6d8-4267-9a74-0c10348f2aba','46053e4b-fffd-4bfe-b5eb-f8ab29dbc562','PASSANGER LIFT TESTING AND CERTIFICATION',2,2000.00,18.00,4000.00);
/*!40000 ALTER TABLE `work_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `quotation_id` varchar(36) DEFAULT NULL,
  `service_id` varchar(36) DEFAULT NULL,
  `work_order_no` varchar(50) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `scheduled_date` date DEFAULT NULL,
  `completed_date` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_orders_work_order_no_key` (`work_order_no`),
  KEY `work_orders_project_id_fkey` (`project_id`),
  KEY `work_orders_quotation_id_fkey` (`quotation_id`),
  KEY `work_orders_service_id_fkey` (`service_id`),
  CONSTRAINT `work_orders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_orders_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_orders_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `service_products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
INSERT INTO `work_orders` VALUES ('46053e4b-fffd-4bfe-b5eb-f8ab29dbc562','84d062e6-6fc1-40c3-a50a-59952e9e1966','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0005','PASSANGER LIFT TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-23 15:06:55.598000','2026-05-23 15:06:55.598000'),('4cbc9448-b6cc-4d32-958b-7a39bde593d3','eded151f-5250-40e5-85c5-fc428f41b2c7','30bead19-493d-4bd8-8d78-862574b303fb',NULL,'WO-2026-0012','smart tv','PENDING',NULL,NULL,'2026-05-25 12:10:39.642000','2026-05-25 12:10:39.642000'),('4eeac8bd-8872-43d2-9c29-0368f3b43005','84d062e6-6fc1-40c3-a50a-59952e9e1966','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0008','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-23 15:06:56.463000','2026-05-23 15:06:56.463000'),('5eae9895-f862-4cd8-8d25-4bbccb03b631','f77ebbb3-f3ec-4ad0-80d6-8893ae897098','821923a6-4e51-4f0e-b676-5c7231fee070',NULL,'WO-2026-0009','Shoes','PENDING',NULL,NULL,'2026-05-25 07:47:58.704000','2026-05-25 07:47:58.704000'),('73e4df1f-3501-451d-8831-e7b9cb30f06c','84d062e6-6fc1-40c3-a50a-59952e9e1966','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0006','AMMONIA PIPELINE TESTING','PENDING',NULL,NULL,'2026-05-23 15:06:56.000000','2026-05-23 15:06:56.000000'),('958135ba-00d7-4af7-8623-6c01c246d0bd','5b9c8fc4-355d-4e10-811b-d7df5373c7c5','c19a1750-a6d3-4342-8a75-0f723a9e9e4d',NULL,'WO-2026-0011','smart board','PENDING',NULL,NULL,'2026-05-25 10:57:40.657000','2026-05-25 10:57:40.657000'),('9eef8687-1e32-4b16-a2b5-d01d898b61fd','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0002','AMMONIA PIPELINE TESTING','PENDING',NULL,NULL,'2026-05-22 14:24:12.492000','2026-05-22 14:24:12.492000'),('a4f2a958-7242-4901-a815-61f7952a0dbc','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0003','GOODS LIFT/LOADER TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-22 14:24:12.721000','2026-05-22 14:24:12.721000'),('be568a21-8efe-4c14-9a19-19bee15edd3c','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0004','PRESSURE VESSELS/AIR RECEIVER TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-22 14:24:12.952000','2026-05-22 14:24:12.952000'),('c0f5c129-92ae-4237-ba97-cd7077c94c20','7fe5ae33-24c7-4ffa-9553-f34b25f8c3d1','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0001','PASSANGER LIFT TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-22 14:24:12.092000','2026-05-22 14:24:12.092000'),('dd90937a-beed-4a5c-999f-d9815fb754d3','84d062e6-6fc1-40c3-a50a-59952e9e1966','096b5ebc-f2ae-4333-a5b0-fc36d45ea1ba',NULL,'WO-2026-0007','GOODS LIFT/LOADER TESTING AND CERTIFICATION','PENDING',NULL,NULL,'2026-05-23 15:06:56.232000','2026-05-23 15:06:56.232000'),('e7b4265c-47ac-4809-bb87-4e9b93a23a97','4117b8dc-90df-4306-8d88-10b5c160ff21','1ed972bb-d078-4b46-be4d-ae9ecbbb20a8',NULL,'WO-2026-0010','Custom Proposal for global webify ','PENDING',NULL,NULL,'2026-05-25 08:15:23.077000','2026-05-25 08:15:23.077000');
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-24 15:12:34
