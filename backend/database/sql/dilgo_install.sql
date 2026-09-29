-- DilGO veritabanı kurulum dosyası (MySQL 8 / MariaDB 10.6+)
-- Tüm tablolar, başlangıç içerikleri (kurslar, hikâyeler, rozetler, mağaza, paketler,
-- sınav soruları, avatarlar) ve migration kayıtları. Kullanıcı hesabı İÇERMEZ.
-- İçe aktarma:  mysql -u KULLANICI -p VERITABANI < dilgo_install.sql
-- Sonra yönetici hesabı:  php artisan dilgo:admin eposta@adres.com
SET NAMES utf8mb4;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `achievements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category` varchar(30) NOT NULL,
  `metric` varchar(40) NOT NULL,
  `threshold` int(10) unsigned NOT NULL,
  `tier` varchar(12) NOT NULL DEFAULT 'bronze',
  `icon` varchar(40) NOT NULL DEFAULT 'star',
  `reward_gems` int(10) unsigned NOT NULL DEFAULT 0,
  `reward_item_key` varchar(255) DEFAULT NULL,
  `is_hidden` tinyint(1) NOT NULL DEFAULT 0,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `achievements_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `achievements` WRITE;
/*!40000 ALTER TABLE `achievements` DISABLE KEYS */;
INSERT INTO `achievements` VALUES
(1,'streak_3','Ateş I','3 günlük seri yap.','streak','streak',3,'bronze','flame',10,NULL,0,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'streak_7','Ateş II','7 günlük seri yap.','streak','streak',7,'bronze','flame',25,NULL,0,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'streak_30','Ateş III','30 günlük seri yap.','streak','streak',30,'silver','flame',100,'streak_freeze',0,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'streak_100','Ateş IV','100 günlük seri yap.','streak','streak',100,'gold','flame',300,'premium_7d',0,3,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'streak_365','Ateş V','365 günlük seri yap.','streak','streak',365,'legend','flame',1000,'live_lesson',0,4,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'xp_100','Enerji I','100 XP topla.','xp','xp_total',100,'bronze','bolt',10,NULL,0,5,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'xp_1000','Enerji II','1000 XP topla.','xp','xp_total',1000,'silver','bolt',50,NULL,0,6,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'xp_5000','Enerji III','5000 XP topla.','xp','xp_total',5000,'gold','bolt',200,NULL,0,7,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,'xp_20000','Enerji IV','20000 XP topla.','xp','xp_total',20000,'legend','bolt',500,NULL,0,8,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(10,'lessons_1','Yolcu I','1 ders tamamla.','lessons','lessons_completed',1,'bronze','path',5,NULL,0,9,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(11,'lessons_10','Yolcu II','10 ders tamamla.','lessons','lessons_completed',10,'bronze','path',20,NULL,0,10,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(12,'lessons_50','Yolcu III','50 ders tamamla.','lessons','lessons_completed',50,'silver','path',80,NULL,0,11,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(13,'lessons_150','Yolcu IV','150 ders tamamla.','lessons','lessons_completed',150,'gold','path',250,NULL,0,12,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(14,'stories_1','Kitap Kurdu I','1 hikaye bitir.','stories','stories_read',1,'bronze','book',10,NULL,0,13,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(15,'stories_5','Kitap Kurdu II','5 hikaye bitir.','stories','stories_read',5,'silver','book',40,NULL,0,14,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(16,'stories_25','Kitap Kurdu III','25 hikaye bitir.','stories','stories_read',25,'gold','book',150,'discount_20',0,15,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(17,'stories_100','Kitap Kurdu IV','100 hikaye bitir.','stories','stories_read',100,'legend','book',500,NULL,0,16,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(18,'words_10','Kelime Avcısı I','10 kelime kaydet.','words','words_saved',10,'bronze','cards',10,NULL,0,17,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(19,'words_100','Kelime Avcısı II','100 kelime kaydet.','words','words_saved',100,'silver','cards',60,NULL,0,18,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(20,'words_500','Kelime Avcısı III','500 kelime kaydet.','words','words_saved',500,'gold','cards',200,NULL,0,19,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(21,'mastery_10','Hafıza Ustası I','10 kelimeyi uzun süreli hafızaya al.','mastery','words_mastered',10,'silver','brain',50,NULL,0,20,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(22,'mastery_100','Hafıza Ustası II','100 kelimeyi uzun süreli hafızaya al.','mastery','words_mastered',100,'gold','brain',250,NULL,0,21,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(23,'speaking_5','Bülbül I','5 konuşma egzersizi yap.','speaking','speaking',5,'bronze','mic',15,NULL,0,22,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(24,'speaking_50','Bülbül II','50 konuşma egzersizi yap.','speaking','speaking',50,'silver','mic',80,NULL,0,23,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(25,'speaking_250','Bülbül III','250 konuşma egzersizi yap.','speaking','speaking',250,'gold','mic',250,'live_lesson',0,24,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(26,'ai_10','Sohbet Kuşu I','10 mesajla Defne ile konuş.','ai','ai_messages',10,'bronze','chat',15,NULL,0,25,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(27,'ai_100','Sohbet Kuşu II','100 mesajla Defne ile konuş.','ai','ai_messages',100,'silver','chat',80,NULL,0,26,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(28,'ai_500','Sohbet Kuşu III','500 mesajla Defne ile konuş.','ai','ai_messages',500,'gold','chat',250,NULL,0,27,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(29,'perfect_1','Keskin Nişancı I','1 hatasız ders bitir.','perfect','perfect_lessons',1,'bronze','target',10,NULL,0,28,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(30,'perfect_10','Keskin Nişancı II','10 hatasız ders bitir.','perfect','perfect_lessons',10,'silver','target',50,NULL,0,29,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(31,'perfect_50','Keskin Nişancı III','50 hatasız ders bitir.','perfect','perfect_lessons',50,'gold','target',200,NULL,0,30,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(32,'social_1','Elçi I','1 arkadaşını davet et.','social','referrals',1,'bronze','users',50,NULL,0,31,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(33,'social_5','Elçi II','5 arkadaşını davet et.','social','referrals',5,'silver','users',200,'premium_7d',0,32,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(34,'social_20','Elçi III','20 arkadaşını davet et.','social','referrals',20,'gold','users',800,'live_lesson',0,33,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(35,'league_1','Kürsü I','1 kez ligde ilk 3\'e gir.','league','league_top3',1,'silver','trophy',50,NULL,0,34,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(36,'league_10','Kürsü II','10 kez ligde ilk 3\'e gir.','league','league_top3',10,'gold','trophy',300,NULL,0,35,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(37,'duel_1','Düellocu I','1 Gölge Düellosu kazan.','duel','duel_wins',1,'bronze','swords',10,NULL,0,36,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(38,'duel_10','Düellocu II','10 Gölge Düellosu kazan.','duel','duel_wins',10,'silver','swords',60,NULL,0,37,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(39,'duel_50','Düellocu III','50 Gölge Düellosu kazan.','duel','duel_wins',50,'gold','swords',250,'mystery_chest',0,38,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(40,'duel_200','Düellocu IV','200 Gölge Düellosu kazan.','duel','duel_wins',200,'legend','swords',800,'live_lesson',0,39,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(41,'balance_2','Dört Dörtlük I','2 . seviyeye dört becerinin hepsinde ulaş.','balance','skills_balanced',2,'bronze','compass',20,NULL,0,40,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(42,'balance_5','Dört Dörtlük II','5 . seviyeye dört becerinin hepsinde ulaş.','balance','skills_balanced',5,'silver','compass',100,NULL,0,41,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(43,'balance_10','Dört Dörtlük III','10 . seviyeye dört becerinin hepsinde ulaş.','balance','skills_balanced',10,'gold','compass',400,'premium_7d',0,42,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(44,'night_owl','Gece Kuşu','Hedefini 30 gün tuttur.','secret','goal_days',30,'gold','moon',150,NULL,1,43,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(45,'diamond_league','Elmas Efsane','Elmas Ligi\'ne ulaş.','secret','league_tier',9,'legend','diamond',1000,'live_lesson',1,44,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `achievements` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ai_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_conversations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `mode` varchar(20) NOT NULL DEFAULT 'chat',
  `scenario_key` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_conversations_user_id_foreign` (`user_id`),
  CONSTRAINT `ai_conversations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ai_conversations` WRITE;
/*!40000 ALTER TABLE `ai_conversations` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_conversations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ai_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ai_conversation_id` bigint(20) unsigned NOT NULL,
  `role` varchar(12) NOT NULL,
  `content` text NOT NULL,
  `feedback` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`feedback`)),
  `input_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `output_tokens` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ai_messages_ai_conversation_id_foreign` (`ai_conversation_id`),
  CONSTRAINT `ai_messages_ai_conversation_id_foreign` FOREIGN KEY (`ai_conversation_id`) REFERENCES `ai_conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ai_messages` WRITE;
/*!40000 ALTER TABLE `ai_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_messages` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ai_scenarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_scenarios` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `category` varchar(30) NOT NULL DEFAULT 'daily',
  `cefr_min` varchar(2) NOT NULL DEFAULT 'A1',
  `system_prompt` text NOT NULL,
  `opening_line` varchar(255) DEFAULT NULL,
  `goals` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`goals`)),
  `is_premium` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_scenarios_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ai_scenarios` WRITE;
/*!40000 ALTER TABLE `ai_scenarios` DISABLE KEYS */;
INSERT INTO `ai_scenarios` VALUES
(1,'meet-a-new-friend','Yeni biriyle tanış','Dil okulunun bahçesinde yeni bir öğrenciyle tanışıyorsun.','👋','daily','A1','You are Sam, a friendly exchange student from Canada at a language school in Istanbul. You just met the learner in the school garden. Use very simple A1 English.','Hi there! I\'m Sam. I\'m new here. What\'s your name?','[\"Ad\\u0131n\\u0131 s\\u00f6yle\",\"Nereli oldu\\u011funu s\\u00f6yle\",\"Sam\'e bir soru sor\"]',0,1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'order-at-a-cafe','Kafede sipariş','Londra\'da bir kafedesin. Siparişini ver ve hesabı öde.','☕','travel','A1','You are a barista at a busy café in London. Take the learner\'s order, suggest a pastry, ask \"for here or to take away?\" and tell them the price.','Hiya! What can I get for you today?','[\"\\u0130\\u00e7ecek sipari\\u015f et\",\"Yiyecek bir \\u015fey sor ya da iste\",\"Hesab\\u0131 \\u00f6de\"]',0,1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'weekend-story','Hafta sonun nasıldı?','İş arkadaşın hafta sonunu soruyor. Geçmiş zamanla anlat.','🎒','daily','A2','You are Jess, a curious coworker. It is Monday morning. Ask about the learner\'s weekend and encourage them to use the past simple. Share a short story about your own weekend too.','Morning! How was your weekend? Did you do anything fun?','[\"Ge\\u00e7mi\\u015f zamanla 3 c\\u00fcmle kur\",\"Bir yer ya da etkinlik anlat\",\"Jess\'e hafta sonunu sor\"]',0,1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'airport-check-in','Havalimanında check-in','Bagajın biraz ağır ve koltuk seçmek istiyorsun.','✈️','travel','A2','You are a check-in agent at Heathrow airport. The learner\'s bag is 2kg overweight. Ask for passport, destination, seat preference and handle the baggage issue politely.','Good afternoon. Can I see your passport, please?','[\"Pasaportunu ver ve gidece\\u011fin yeri s\\u00f6yle\",\"Koltuk tercihi yap\",\"Fazla bagaj sorununu \\u00e7\\u00f6z\"]',0,1,3,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'doctor-visit','Doktorda','Yurt dışında hastalandın, belirtilerini anlat.','🩺','travel','A2','You are a calm GP doctor in Dublin. Ask about the learner\'s symptoms, how long they have had them and any allergies, then give simple advice.','Hello, please have a seat. What seems to be the problem?','[\"Belirtilerini anlat\",\"Ne zamand\\u0131r s\\u00fcrd\\u00fc\\u011f\\u00fcn\\u00fc s\\u00f6yle\",\"Doktora bir soru sor\"]',1,1,4,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'job-interview','İş mülakatı','Uluslararası bir şirkette ilk mülakatın.','💼','career','B1','You are Mr Carter, a hiring manager at an international tourism company. Run a realistic but friendly interview: ask about experience, strengths, a difficult situation, and why they want the job. Give the learner space to answer fully.','Thanks for coming in. So, tell me a little about yourself.','[\"Kendini tan\\u0131t\",\"Bir g\\u00fc\\u00e7l\\u00fc y\\u00f6n\\u00fcn\\u00fc \\u00f6rnekle anlat\",\"Zor bir durumu nas\\u0131l \\u00e7\\u00f6zd\\u00fc\\u011f\\u00fcn\\u00fc anlat\",\"\\u015eirkete bir soru sor\"]',1,1,5,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'ielts-speaking','IELTS Speaking Part 2','Sınav formatında 2 dakikalık konuşma ve takip soruları.','🎓','exam','B1','You are an IELTS speaking examiner. Give the learner a Part 2 cue card topic, let them speak, then ask two Part 3 follow-up questions. At the end estimate a band score with one tip.','Now I\'m going to give you a topic. Describe a place you visited that you would like to go back to. You should say where it is, when you went, what you did there, and explain why you\'d like to return.','[\"Konuyu en az 5 c\\u00fcmleyle anlat\",\"Takip sorular\\u0131na cevap ver\",\"Ba\\u011fla\\u00e7lar kullan (however, because, although)\"]',1,1,6,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'debate-club','Münazara kulübü','\"Sosyal medya gençlere zarar mı veriyor?\" Fikrini savun.','🎤','fun','B1','You are Priya, captain of a university debate club. Take the opposite side to whatever the learner argues about social media and young people. Challenge them respectfully and push for reasons and examples.','Okay, today\'s motion: \"Social media does more harm than good for teenagers.\" Which side are you on?','[\"Taraf\\u0131n\\u0131 se\\u00e7 ve bir sebep sun\",\"Bir \\u00f6rnek ver\",\"Kar\\u015f\\u0131 arg\\u00fcmana cevap ver\"]',1,1,7,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `ai_scenarios` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `subject_type` varchar(255) DEFAULT NULL,
  `subject_id` bigint(20) unsigned DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_subject_type_subject_id_index` (`subject_type`,`subject_id`),
  KEY `audit_logs_action_index` (`action`),
  KEY `audit_logs_created_at_index` (`created_at`),
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `avatars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `avatars` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(40) NOT NULL,
  `label` varchar(60) NOT NULL,
  `tier` varchar(12) NOT NULL DEFAULT 'standard',
  `image_path` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `avatars_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `avatars` WRITE;
/*!40000 ALTER TABLE `avatars` DISABLE KEYS */;
INSERT INTO `avatars` VALUES
(1,'headphones','Müziksever','standard',NULL,1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'afro','Ritim','standard',NULL,1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'braids','Örgülü','standard',NULL,1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'cap','Sokak','standard',NULL,1,3,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'buns','Topuzlu','standard',NULL,1,4,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'hoodie','Kapüşonlu','standard',NULL,1,5,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'glasses','Kod','standard',NULL,1,6,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'pinkbob','Pembe','standard',NULL,1,7,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,'ponytail','Kampüs','standard',NULL,1,8,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(10,'astronaut','Astronot','premium',NULL,1,100,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(11,'wizard','Büyücü','premium',NULL,1,101,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(12,'king','Kral','premium',NULL,1,102,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(13,'pilot','Pilot','premium',NULL,1,103,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(14,'scientist','Bilim insanı','premium',NULL,1,104,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(15,'chef','Şef','premium',NULL,1,105,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(16,'jazz','Cazcı','premium',NULL,1,106,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(17,'detective','Dedektif','premium',NULL,1,107,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(18,'explorer','Kaşif','premium',NULL,1,108,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `avatars` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `blog_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_posts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `excerpt` varchar(400) DEFAULT NULL,
  `body` longtext NOT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `category` varchar(40) DEFAULT NULL,
  `author_name` varchar(80) NOT NULL DEFAULT 'Bayrak Dil Okulları',
  `seo_title` varchar(70) DEFAULT NULL,
  `seo_description` varchar(170) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `reading_minutes` smallint(5) unsigned NOT NULL DEFAULT 4,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `published_at` timestamp NULL DEFAULT NULL,
  `views` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blog_posts_slug_unique` (`slug`),
  KEY `blog_posts_category_index` (`category`),
  KEY `blog_posts_is_published_index` (`is_published`),
  KEY `blog_posts_published_at_index` (`published_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `blog_posts` WRITE;
/*!40000 ALTER TABLE `blog_posts` DISABLE KEYS */;
INSERT INTO `blog_posts` VALUES
(1,'her-gun-10-dakikada-ingilizce','Her gün 10 dakikada İngilizce: işe yarayan bir rutin','Uzun ama seyrek çalışmak yerine kısa ve düzenli çalışmak neden daha etkili? Sınıflarımızda denediğimiz 10 dakikalık rutini paylaşıyoruz.','## Neden kısa ve düzenli?\n\nBeynimiz yeni kelimeleri tekrar edildiğinde kalıcı hafızaya taşır. Haftada bir gün üç saat çalışmak yerine her gün 10 dakika çalışan öğrencilerimiz, üç ayın sonunda **iki kat daha fazla kelimeyi** hatırlıyor.\n\n## 10 dakikalık rutin\n\n- **2 dakika, tekrar:** Dünkü kelimeleri kelime kartlarıyla hızlıca tekrar et.\n- **4 dakika, oku ve dinle:** Seviyene uygun kısa bir hikayeyi önce dinle, sonra oku.\n- **3 dakika, konuş:** Hikayedeki iki cümleyi sesli tekrar et ya da Defne\'ye hikayeyi anlat.\n- **1 dakika, yaz:** Bugün öğrendiğin bir kelimeyle kendi cümleni kur.\n\n## Seriyi bozmamak için\n\nGünlük hedefini gerçekçi seç. Yoğun bir gününde 5 dakikalık bir tekrar bile serini korur. Tatile çıkacaksan mağazadan bir **seri dondurucu** almayı unutma.\n\n> Küçük adımlar, her gün. Akıcılık böyle gelir.','/img/blog/routine.webp','Öğrenme ipuçları','Bayrak Dil Okulları',NULL,NULL,NULL,5,1,'2026-09-26 10:30:35',0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'turklerin-en-sik-yaptigi-7-ingilizce-hatasi','Türklerin en sık yaptığı 7 İngilizce hatası','\"I am agree\", \"informations\", \"I will go to home\"… Öğretmenlerimizin sınıfta en çok düzelttiği hataları ve doğrularını derledik.','## 1. I am agree ❌ → I agree ✅\n\n*Agree* zaten bir fiil. Yanına *am/is/are* gelmez.\n\n## 2. informations ❌ → information ✅\n\n*Information*, *advice*, *furniture* gibi kelimeler sayılamaz; çoğul eki almaz.\n\n## 3. I will go to home ❌ → I will go home ✅\n\n*Home* yön bildirirken *to* almaz.\n\n## 4. I have 25 years old ❌ → I am 25 years old ✅\n\nYaş İngilizcede *to be* ile söylenir.\n\n## 5. He don\'t like ❌ → He doesn\'t like ✅\n\n*He / she / it* ile olumsuzda **doesn\'t** kullanılır.\n\n## 6. I am living in Izmir since 2019 ❌ → I have lived in Izmir since 2019 ✅\n\n*Since* ve *for* ile süregelen durumlar için present perfect kullanılır.\n\n## 7. Explain me ❌ → Explain to me ✅\n\n*Explain* fiili kişiyi doğrudan nesne olarak almaz.\n\nAda, sohbet ederken bu hataları yakalar ve Türkçe açıklar. Birkaç mesajla dene!','/img/blog/books.webp','Dilbilgisi','Bayrak Dil Okulları',NULL,NULL,NULL,6,1,'2026-09-21 10:30:35',0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'ielts-speaking-hazirlik-rehberi','IELTS Speaking için 4 haftalık hazırlık planı','Speaking bölümünde band puanını yükseltmek için akıcılık, kelime çeşitliliği ve telaffuza haftalık odaklanan bir plan.','## 1. hafta: Akıcılık\n\nHer gün Part 1 sorularına 2 dakika kesintisiz cevap ver. Mükemmel cümleler kurmaya çalışma, konuşmayı sürdür.\n\n## 2. hafta: Part 2 kartları\n\nDilGO\'daki **IELTS Speaking Part 2** senaryosunda her gün bir kart çalış. 1 dakika not al, 2 dakika konuş.\n\n## 3. hafta: Kelime ve bağlaçlar\n\n*However, although, on the other hand, as a result* gibi bağlaçları bilinçli kullan. Defne\'nin önerdiği yeni kelimeleri kelime defterine ekle.\n\n## 4. hafta: Deneme sınavları\n\nBayrak Dil Okulları\'nda bir öğretmenimizle gerçek sınav formatında deneme yap. Canlı ders kuponunu burada kullanabilirsin.\n\n### Son ipucu\n\nSınav günü bilmediğin bir kelimeyle karşılaşırsan susma; *\"It\'s a kind of…\"* diyerek açıkla. Akıcılık, mükemmellikten daha çok puan getirir.','/img/scenarios/ielts-speaking.webp','Sınavlar','Bayrak Dil Okulları',NULL,NULL,NULL,7,1,'2026-09-16 10:30:35',0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'is-hayatinda-ingilizce-toplanti-ifadeleri','İş hayatında İngilizce: toplantıda işe yarayan 12 ifade','Söz almak, fikir belirtmek, kibarca itiraz etmek… Toplantılarda kendini rahat ifade etmen için hazır kalıplar.','## Söz almak\n\n- *Could I add something here?*\n- *If I may, I\'d like to comment on that.*\n\n## Fikir belirtmek\n\n- *From my point of view, …*\n- *I\'m fairly confident that …*\n\n## Kibarca itiraz etmek\n\n- *I see your point, but …*\n- *I\'m not sure I completely agree.*\n\n## Netleştirmek\n\n- *Just to clarify, do you mean …?*\n- *Could you go over that again?*\n\n## Toplantıyı bitirmek\n\n- *Let\'s wrap up here.*\n- *I\'ll send a summary by email.*\n\nBu ifadeleri DilGO\'daki **İş mülakatı** senaryosunda Defne ile pratik edebilirsin.','/img/blog/coworkers.webp','Kariyer','Bayrak Dil Okulları',NULL,NULL,NULL,4,1,'2026-09-11 10:30:35',0,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `blog_posts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `topic` varchar(30) NOT NULL DEFAULT 'general',
  `message` text NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'new',
  `admin_note` text DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contact_messages_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `coupon_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_redemptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `order_id` bigint(20) unsigned NOT NULL,
  `discount` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `coupon_redemptions_coupon_id_foreign` (`coupon_id`),
  KEY `coupon_redemptions_user_id_foreign` (`user_id`),
  KEY `coupon_redemptions_order_id_foreign` (`order_id`),
  CONSTRAINT `coupon_redemptions_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_redemptions_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_redemptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `coupon_redemptions` WRITE;
/*!40000 ALTER TABLE `coupon_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupon_redemptions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` varchar(10) NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL,
  `max_uses` int(10) unsigned DEFAULT NULL,
  `max_uses_per_user` smallint(5) unsigned NOT NULL DEFAULT 1,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `min_amount` decimal(10,2) DEFAULT NULL,
  `plan_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`plan_ids`)),
  `first_order_only` tinyint(1) NOT NULL DEFAULT 0,
  `owner_user_id` bigint(20) unsigned DEFAULT NULL,
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_unique` (`code`),
  KEY `coupons_owner_user_id_foreign` (`owner_user_id`),
  CONSTRAINT `coupons_owner_user_id_foreign` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES
(1,'HOSGELDIN','İlk alışverişe %25 indirim','percent',25.00,NULL,1,0,NULL,NULL,1,NULL,NULL,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cefr_level` varchar(2) NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#E4572E',
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `courses_slug_unique` (`slug`),
  KEY `courses_cefr_level_index` (`cefr_level`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES
(1,'a1-baslangic','A1 · İlk Adımlar','Selamlaşmadan günlük rutine: İngilizcede ilk cümlelerini kur, ilk hikayeni oku, ilk sohbetini yap.','A1','#FF5A36',0,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'a2-yol-arkadasi','A2 · Yol Arkadaşı','Geçmişi anlat, planlarını paylaş, iş hayatına ilk adımı at.','A2','#2EC4A0',1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'b1-ozgur-konusma','B1 · Özgürce Konuş','Deneyimlerini anlat, fikir savun, hikayelerin derinine in.','B1','#3A6FF7',2,1,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `daily_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `date` date NOT NULL,
  `xp` int(10) unsigned NOT NULL DEFAULT 0,
  `lessons` smallint(5) unsigned NOT NULL DEFAULT 0,
  `stories` smallint(5) unsigned NOT NULL DEFAULT 0,
  `reviews` smallint(5) unsigned NOT NULL DEFAULT 0,
  `ai_messages` smallint(5) unsigned NOT NULL DEFAULT 0,
  `speaking` smallint(5) unsigned NOT NULL DEFAULT 0,
  `perfect_lessons` smallint(5) unsigned NOT NULL DEFAULT 0,
  `minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `goal_met` tinyint(1) NOT NULL DEFAULT 0,
  `freeze_used` tinyint(1) NOT NULL DEFAULT 0,
  `xp_reading` int(10) unsigned NOT NULL DEFAULT 0,
  `xp_listening` int(10) unsigned NOT NULL DEFAULT 0,
  `xp_speaking` int(10) unsigned NOT NULL DEFAULT 0,
  `xp_writing` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_activities_user_id_date_unique` (`user_id`,`date`),
  CONSTRAINT `daily_activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `daily_activities` WRITE;
/*!40000 ALTER TABLE `daily_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_activities` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `duels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `duels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `ghost_id` bigint(20) unsigned DEFAULT NULL,
  `ghost_name` varchar(60) NOT NULL,
  `ghost_trophies` int(10) unsigned NOT NULL DEFAULT 0,
  `ghost_tier` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `ghost_skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ghost_skills`)),
  `rounds` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`rounds`)),
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `score` smallint(5) unsigned NOT NULL DEFAULT 0,
  `ghost_score` smallint(5) unsigned NOT NULL DEFAULT 0,
  `result` varchar(10) DEFAULT NULL,
  `trophies_delta` smallint(6) NOT NULL DEFAULT 0,
  `ghost_delta` smallint(6) NOT NULL DEFAULT 0,
  `ghost_notified` tinyint(1) NOT NULL DEFAULT 0,
  `finished_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `duels_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `duels_ghost_id_finished_at_index` (`ghost_id`,`finished_at`),
  CONSTRAINT `duels_ghost_id_foreign` FOREIGN KEY (`ghost_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `duels_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `duels` WRITE;
/*!40000 ALTER TABLE `duels` DISABLE KEYS */;
/*!40000 ALTER TABLE `duels` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `email_otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_otps` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `purpose` varchar(30) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email_otps_user_id_foreign` (`user_id`),
  KEY `email_otps_email_purpose_index` (`email`,`purpose`),
  KEY `email_otps_email_index` (`email`),
  CONSTRAINT `email_otps_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `email_otps` WRITE;
/*!40000 ALTER TABLE `email_otps` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_otps` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `exam_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `exam_question_id` bigint(20) unsigned NOT NULL,
  `exam` varchar(16) NOT NULL,
  `section` varchar(32) NOT NULL,
  `correct` tinyint(1) NOT NULL,
  `ms` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `exam_attempts_exam_question_id_foreign` (`exam_question_id`),
  KEY `exam_attempts_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `exam_attempts_exam_question_id_foreign` FOREIGN KEY (`exam_question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exam_attempts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `exam_attempts` WRITE;
/*!40000 ALTER TABLE `exam_attempts` DISABLE KEYS */;
/*!40000 ALTER TABLE `exam_attempts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `exam_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_questions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `exams` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`exams`)),
  `section` varchar(32) NOT NULL,
  `cefr` varchar(2) NOT NULL DEFAULT 'B2',
  `passage` text DEFAULT NULL,
  `prompt` text NOT NULL,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`options`)),
  `answer` tinyint(3) unsigned NOT NULL,
  `explanation` text DEFAULT NULL,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `exam_questions_section_index` (`section`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `exam_questions` WRITE;
/*!40000 ALTER TABLE `exam_questions` DISABLE KEYS */;
INSERT INTO `exam_questions` VALUES
(1,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','vocabulary','B2',NULL,'The new vaccine proved highly ---- in clinical trials, reducing infection rates by nearly 90 percent.','[\"ambiguous\",\"obsolete\",\"redundant\",\"reluctant\",\"efficacious\"]',4,'Efficacious = etkili. Enfeksiyonu %90 azaltan bir aşı için olumlu ve etki bildiren tek sıfat bu. Ambiguous (belirsiz), redundant (gereksiz), obsolete (modası geçmiş) anlamı bozar.',0,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','vocabulary','B2',NULL,'Despite years of research, scientists have not yet been able to ---- the exact cause of the disease.','[\"postpone\",\"undermine\",\"pinpoint\",\"exaggerate\",\"abandon\"]',2,'Pinpoint = tam olarak tespit etmek. \'Kesin nedeni\' ifadesiyle birlikte kullanılır. Undermine (zayıflatmak) ve postpone (ertelemek) bağlama uymaz.',1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'[\"yds\",\"yokdil\",\"ydt\"]','vocabulary','B2',NULL,'The committee decided to ---- the meeting until all members could attend.','[\"look into\",\"give in\",\"make up\",\"turn down\",\"put off\"]',4,'Put off = ertelemek. \'Herkes katılana kadar\' ifadesi zamanı ileri atmayı gösterir. Turn down reddetmek, look into incelemek demektir.',2,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'[\"yds\",\"yokdil\",\"ielts\",\"toefl\"]','vocabulary','C1',NULL,'The economist argued that the government\'s policies would only ---- the gap between the rich and the poor.','[\"alleviate\",\"commemorate\",\"accommodate\",\"exacerbate\",\"illuminate\"]',3,'Exacerbate = kötüleştirmek, derinleştirmek. \'Only\' vurgusu eleştirel bir ton verir; alleviate (hafifletmek) tam tersi anlamdadır ve tuzak şıktır.',3,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','vocabulary','B2',NULL,'Many species are now ---- to extinction because their natural habitats are disappearing.','[\"accustomed\",\"indifferent\",\"vulnerable\",\"immune\",\"superior\"]',2,'Vulnerable to = -e karşı savunmasız. Immune to (bağışık) zıt anlamlı tuzaktır; accustomed to (alışkın) bağlama uymaz.',4,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'[\"yds\",\"yokdil\",\"ydt\"]','vocabulary','B1',NULL,'Our flight was delayed, so we had to ---- a hotel near the airport for the night.','[\"set off\",\"run out of\",\"bring up\",\"check into\",\"get over\"]',3,'Check into a hotel = otele giriş yapmak. Run out of (tükenmek), get over (atlatmak), set off (yola çıkmak) cümleye uymaz.',5,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','grammar','B2',NULL,'By the time the rescue team arrived, the fire ---- most of the building.','[\"destroys\",\"was destroying\",\"would destroy\",\"has destroyed\",\"had destroyed\"]',4,'\'By the time + geçmiş zaman\' yapısında daha önce tamamlanmış eylem past perfect (had + V3) ile anlatılır.',6,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','grammar','B2',NULL,'---- the heavy rain, the match went ahead as planned.','[\"Because of\",\"Unless\",\"Although\",\"Despite\",\"Whereas\"]',3,'Boşluktan sonra isim (the heavy rain) geliyor; zıtlık bildiren edat \'despite\' gerekir. \'Although\' cümle ister, \'because of\' zıtlık değil neden bildirir.',7,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,'[\"yds\",\"yokdil\",\"ydt\"]','grammar','B2',NULL,'If the researchers ---- more funding, they could have completed the project on time.','[\"have received\",\"would receive\",\"receive\",\"received\",\"had received\"]',4,'Ana cümlede \'could have completed\' var: geçmişe dönük gerçek dışı koşul (Type 3). Yan cümlede past perfect kullanılır.',8,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(10,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','grammar','B2',NULL,'The report, ---- was published last week, has caused a lot of controversy.','[\"which\",\"whose\",\"where\",\"what\",\"that\"]',0,'Virgülle ayrılmış (non-defining) sıfat cümlesinde \'that\' kullanılamaz; nesneyi niteleyen \'which\' doğrudur.',9,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(11,'[\"yds\",\"yokdil\",\"ydt\"]','grammar','C1',NULL,'Not only ---- the deadline, but he also forgot to inform his manager.','[\"he did miss\",\"missed he\",\"did he miss\",\"he missed\",\"has he missing\"]',2,'\'Not only\' cümle başında olduğunda devrik yapı gelir: yardımcı fiil + özne + fiil (did he miss).',10,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(12,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','grammar','B2',NULL,'The more you practise speaking, ---- you will become.','[\"more confident\",\"the confident\",\"the more confident\",\"the most confident\",\"most confident\"]',2,'\'The more ..., the more ...\' kalıbı: bir şey arttıkça diğeri de artar. İkinci yarı da \'the + comparative\' ile kurulur.',11,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(13,'[\"yds\",\"yokdil\",\"ydt\"]','cloze','C1','Urban gardens are becoming increasingly popular in large cities. (1) ---- providing fresh produce, they also help reduce air pollution and create green spaces where neighbours can meet. However, their success largely depends (2) ---- the support of local authorities.','(1) numaralı boşluğa hangisi gelir?','[\"In spite of\",\"On behalf of\",\"In addition to\",\"Instead of\",\"Regardless of\"]',2,'Cümle ek fayda sayıyor (also help...). \'In addition to + V-ing\' = -e ek olarak. Instead of (yerine) ve in spite of (rağmen) anlamı bozar.',14,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(14,'[\"yds\",\"yokdil\",\"ydt\"]','cloze','C1','Urban gardens are becoming increasingly popular in large cities. (1) ---- providing fresh produce, they also help reduce air pollution and create green spaces where neighbours can meet. However, their success largely depends (2) ---- the support of local authorities.','(2) numaralı boşluğa hangisi gelir?','[\"with\",\"at\",\"for\",\"on\",\"in\"]',3,'\'Depend on\' sabit bir fiil-edat kalıbıdır: -e bağlı olmak.',15,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(15,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','sentence_completion','B2',NULL,'Although electric cars are becoming cheaper, ----.','[\"their batteries have improved considerably in recent years\",\"governments are offering tax reductions to buyers\",\"many people are still worried about the limited number of charging stations\",\"they produce no exhaust emissions at all\",\"more models are available than ever before\"]',2,'\'Although\' zıtlık ister: arabalar ucuzluyor AMA insanlar hâlâ endişeli. Diğer şıklar elektrikli araçların lehine olup zıtlık kurmaz.',16,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(16,'[\"yds\",\"yokdil\",\"ydt\"]','sentence_completion','B2',NULL,'Unless the city invests in public transport, ----.','[\"the new metro line was opened last year\",\"traffic congestion will continue to get worse\",\"buses were cheaper in the past\",\"more people have started cycling to work\",\"residents voted for a new mayor\"]',1,'\'Unless\' (-mezse) koşul bildirir; ana cümle gelecek zamanlı bir sonuç ister: \'will continue\'. Diğer şıklar zaman ve anlamca uymaz.',17,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(17,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','sentence_completion','C1',NULL,'So complex was the problem that ----.','[\"the engineers found it quite simple\",\"it was solved in a few minutes by a student\",\"even the most experienced engineers needed weeks to solve it\",\"nobody had ever heard of it before\",\"the company decided to hire more staff last year\"]',2,'\'So ... that\' sonuç bildirir: sorun o kadar karmaşıktı ki en deneyimli mühendisler bile haftalarca uğraştı. Diğer şıklar karmaşıklığın doğal sonucu değildir.',18,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(18,'[\"yds\",\"yokdil\",\"ydt\"]','sentence_completion','B2',NULL,'----, the museum attracts thousands of visitors every summer.','[\"Although it is difficult to reach\",\"Unless it is renovated\",\"Since it was closed for repairs\",\"Even though tickets are free\",\"Located in the heart of the old town\"]',4,'Kısaltılmış sıfat cümlesi (Located in...) müzeyi niteleyip ziyaretçi çekmesinin nedenini verir. \'Although/even though\' zıtlık kurar ama cümlede zıtlık yok.',19,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(19,'[\"yds\",\"yokdil\",\"ydt\"]','translation','B2',NULL,'Scientists believe that regular exercise can significantly reduce the risk of heart disease.','[\"Bilim insanlar\\u0131 kalp hastal\\u0131\\u011f\\u0131n\\u0131n d\\u00fczenli egzersizle tamamen \\u00f6nlenebildi\\u011fini kan\\u0131tlad\\u0131.\",\"D\\u00fczenli egzersiz yapan bilim insanlar\\u0131n\\u0131n kalp hastal\\u0131\\u011f\\u0131 riski olduk\\u00e7a d\\u00fc\\u015f\\u00fckt\\u00fcr.\",\"Bilim insanlar\\u0131na g\\u00f6re kalp hastalar\\u0131 d\\u00fczenli olarak egzersiz yapmal\\u0131d\\u0131r.\",\"Bilim insanlar\\u0131 d\\u00fczenli egzersizin kalp hastal\\u0131\\u011f\\u0131 riskini \\u00f6nemli \\u00f6l\\u00e7\\u00fcde azaltabilece\\u011fine inan\\u0131yor.\",\"Kalp hastal\\u0131\\u011f\\u0131 riskini azaltmak i\\u00e7in bilim insanlar\\u0131 d\\u00fczenli egzersiz \\u00f6neriyor.\"]',3,'\'Believe that\' = inanıyor, \'can significantly reduce\' = önemli ölçüde azaltabilir. B şıkkı \'kanıtladı\' ve \'tamamen\' diyerek anlamı abartıyor; E şıkkı \'öneriyor\' diyerek fiili değiştiriyor.',20,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(20,'[\"yds\",\"yokdil\",\"ydt\"]','translation','B2',NULL,'Türkiye\'nin en kalabalık şehri olan İstanbul, iki kıta üzerinde kurulmuştur.','[\"Turkey\'s biggest city Istanbul was once built on two different continents.\",\"Istanbul, which is the most populous city in Turkey, is built on two continents.\",\"Being built on two continents, Istanbul became Turkey\'s largest city.\",\"Istanbul is one of the most crowded cities built between two continents.\",\"The population of Istanbul, a city on two continents, is the highest in the world.\"]',1,'Ara söz \'Türkiye\'nin en kalabalık şehri olan\' bir sıfat cümlesiyle (which is the most populous city in Turkey) çevrilir. D şıkkı neden sonuç ilişkisi ekliyor, E şıkkı \'dünyada\' diyerek anlamı değiştiriyor.',21,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(21,'[\"yds\",\"yokdil\"]','translation','C1',NULL,'Had the data been analysed more carefully, the researchers would have noticed the error much earlier.','[\"Veriler daha dikkatli analiz edilseydi, ara\\u015ft\\u0131rmac\\u0131lar hatay\\u0131 \\u00e7ok daha \\u00f6nce fark ederdi.\",\"Ara\\u015ft\\u0131rmac\\u0131lar\\u0131n hatay\\u0131 fark etmesi i\\u00e7in verilerin dikkatle analiz edilmesi gerekiyor.\",\"Veriler analiz edildi\\u011finde ara\\u015ft\\u0131rmac\\u0131lar hatan\\u0131n \\u00e7ok eski oldu\\u011funu fark etti.\",\"Veriler daha dikkatli analiz edilirse, ara\\u015ft\\u0131rmac\\u0131lar hatay\\u0131 daha \\u00f6nce fark edecek.\",\"Ara\\u015ft\\u0131rmac\\u0131lar verileri dikkatlice analiz ettikleri i\\u00e7in hatay\\u0131 erkenden fark etti.\"]',0,'\'Had the data been analysed\' devrik Type 3 koşuldur: geçmişte gerçekleşmemiş durum (edilseydi ... ederdi). B şıkkı olmuş bir olayı anlatıyor, E şıkkı gelecek zaman kullanıyor.',22,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(22,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','reading','B2','Bees play a vital role in agriculture. Around one third of the food we eat depends on pollination, and bees are responsible for most of it. In recent decades, however, bee populations have declined sharply in many parts of the world. Scientists point to several causes, including pesticide use, habitat loss and climate change. Some farmers have responded by planting wildflowers along the edges of their fields, which provide food and shelter for bees throughout the year.','According to the passage, why do some farmers plant wildflowers?','[\"To support bee populations by giving them food and shelter\",\"To replace crops that depend on pollination\",\"To increase the price of their crops\",\"To attract tourists to their farms\",\"To reduce their use of pesticides\"]',0,'Son cümle cevabı açıkça veriyor: kır çiçekleri arılara yıl boyunca \'food and shelter\' sağlar. Pestisit metinde neden olarak geçiyor, çözüm olarak değil.',23,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(23,'[\"yds\",\"yokdil\",\"ydt\",\"ielts\",\"toefl\"]','reading','B2','Bees play a vital role in agriculture. Around one third of the food we eat depends on pollination, and bees are responsible for most of it. In recent decades, however, bee populations have declined sharply in many parts of the world. Scientists point to several causes, including pesticide use, habitat loss and climate change. Some farmers have responded by planting wildflowers along the edges of their fields, which provide food and shelter for bees throughout the year.','The word \'declined\' in the passage is closest in meaning to ----.','[\"multiplied\",\"stabilised\",\"recovered\",\"decreased\",\"migrated\"]',3,'Decline = azalmak (decrease). \'Sharply\' ile birlikte keskin bir düşüşü anlatır. Recovered ve multiplied zıt anlamlı tuzaklardır.',24,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(24,'[\"yds\",\"yokdil\",\"ielts\",\"toefl\"]','reading','C1','The concept of a four-day working week has gained traction in several countries. Proponents argue that shorter weeks lead to higher productivity, better mental health and lower carbon emissions from commuting. A large trial in the United Kingdom found that most participating companies maintained their output while employees reported less stress. Critics, however, caution that the model may not suit every sector; hospitals and schools, for instance, cannot simply close for an extra day.','What is the main purpose of the passage?','[\"To prove that every company should adopt a four-day week\",\"To argue that productivity always falls when hours are reduced\",\"To explain why hospitals are closed on Fridays\",\"To describe the history of working hours in the UK\",\"To present the benefits of a four-day week alongside its limitations\"]',4,'Metin önce savunucuların görüşlerini ve deney sonucunu, ardından eleştirileri veriyor: dengeli bir sunum. \'Prove\' ve \'always\' gibi kesin ifadeler metinde desteklenmiyor.',25,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(25,'[\"yds\",\"yokdil\",\"ielts\",\"toefl\"]','reading','C1','The concept of a four-day working week has gained traction in several countries. Proponents argue that shorter weeks lead to higher productivity, better mental health and lower carbon emissions from commuting. A large trial in the United Kingdom found that most participating companies maintained their output while employees reported less stress. Critics, however, caution that the model may not suit every sector; hospitals and schools, for instance, cannot simply close for an extra day.','It can be inferred from the passage that the UK trial ----.','[\"only included hospitals and schools\",\"did not lead to a significant loss of output for most companies\",\"showed that critics were completely right\",\"increased carbon emissions from commuting\",\"was cancelled because employees felt stressed\"]',1,'\'Most participating companies maintained their output\' = çoğu şirket üretimini korudu, yani önemli bir kayıp yaşanmadı. Diğer şıklar metinle çelişiyor.',26,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(26,'[\"yds\",\"ydt\"]','dialogue','B1',NULL,'Emma: I\'ve been offered a job in Berlin, but I don\'t speak any German.\nLeo: ----\nEmma: That\'s true. Most of my colleagues would speak English anyway.','[\"Berlin is the capital of Germany, isn\'t it?\",\"I have never been to Berlin myself.\",\"German is a very difficult language to learn.\",\"You should never accept a job abroad.\",\"Well, a lot of international companies there work in English.\"]',4,'Emma\'nın cevabı (\'That\'s true... English anyway\') Leo\'nun İngilizcenin iş dili olduğunu söylediğini gösterir. E şıkkı endişeyi artırır ve \'That\'s true\' ile desteklenemez.',27,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(27,'[\"yds\",\"ydt\"]','dialogue','B2',NULL,'Doctor: Your test results look fine, but you seem quite tired.\nPatient: ----\nDoctor: Then try to switch off your phone an hour before bed.','[\"I\'ve been having trouble sleeping; I usually check messages until midnight.\",\"Can I get a copy of my test results?\",\"I feel great, I sleep nine hours every night.\",\"I don\'t like taking medicine.\",\"My sister is also a doctor.\"]',0,'Doktorun tavsiyesi (telefonu yatmadan önce kapat) hastanın uyku ve telefon kullanımıyla ilgili bir sorun anlattığını gösterir.',28,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(28,'[\"yds\",\"yokdil\",\"ydt\"]','paragraph','B2',NULL,'Plastic waste is one of the most serious environmental problems of our time. Every year, millions of tonnes of plastic end up in the oceans, harming marine life. ----. As a result, several countries have banned single-use plastic bags and straws.','[\"Oceans cover more than seventy percent of the Earth\'s surface\",\"Some people prefer paper bags because they look nicer\",\"Plastic was invented at the beginning of the twentieth century\",\"Many sea animals mistake small plastic pieces for food and die\",\"Recycling centres are usually closed at weekends\"]',3,'Boşluk, deniz canlılarına verilen zararı açıklamalı ve \'As a result... banned\' sonucuna zemin hazırlamalı. Diğer şıklar konu dışı bilgiler veriyor.',29,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(29,'[\"yds\",\"yokdil\",\"ydt\"]','paragraph','C1',NULL,'Learning a second language changes the brain in measurable ways. ----. For example, bilingual people often perform better on tasks that require switching attention between different activities. Some studies even suggest that speaking two languages may delay the onset of dementia.','[\"Research shows that it strengthens areas linked to attention and memory\",\"Some languages have more than twenty vowel sounds\",\"It is easier to learn a language as a child than as an adult\",\"Many schools in Europe teach English from primary level\",\"Translators usually work with at least three languages\"]',0,'Boşluktan sonra gelen \'For example\' dikkat değiştirme becerisinden bahsediyor; boşluk bu örneği kapsayan genel bir iddia olmalı: dikkat ve hafıza bölgelerinin güçlenmesi.',30,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(30,'[\"yds\",\"yokdil\",\"ydt\"]','irrelevant','B2',NULL,'(I) Coffee is one of the most traded commodities in the world. (II) It is grown in more than seventy countries, mainly in tropical regions. (III) Brazil alone produces about a third of the global supply. (IV) Tea, on the other hand, originated in China thousands of years ago. (V) Changes in weather in coffee-growing areas can therefore affect prices worldwide.','[\"I\",\"II\",\"III\",\"IV\",\"V\"]',3,'Paragraf kahve üretimi ve ticaretini anlatıyor. IV. cümle çayın kökenine geçerek akışı bozuyor; V. cümle \'therefore\' ile III\'e bağlanıyor.',31,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(31,'[\"yds\",\"yokdil\",\"ydt\"]','irrelevant','C1',NULL,'(I) Remote work has transformed the daily lives of millions of employees. (II) Without long commutes, many workers report having more time for family and exercise. (III) The first computer mouse was made of wood. (IV) At the same time, some people feel isolated and miss informal chats with colleagues. (V) Companies are therefore experimenting with hybrid models that combine home and office work.','[\"I\",\"II\",\"III\",\"IV\",\"V\"]',2,'Paragraf uzaktan çalışmanın etkilerini tartışıyor. III. cümle bilgisayar faresinin tarihine dair ilgisiz bir bilgi.',32,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(32,'[\"ielts\",\"toefl\"]','vocabulary','C1',NULL,'The lecturer gave a ---- overview of the topic, covering its history, current debates and future directions in just twenty minutes.','[\"superficial\",\"tedious\",\"fragile\",\"reluctant\",\"comprehensive\"]',4,'Tarihi, güncel tartışmaları ve geleceği kapsayan bir özet \'comprehensive\' (kapsamlı) olur. Superficial (yüzeysel) \'covering its history, current debates...\' ile çelişir.',33,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(33,'[\"ielts\",\"toefl\"]','grammar','B2',NULL,'Hardly ---- the lecture started when the fire alarm went off.','[\"have\",\"was\",\"had\",\"has\",\"did\"]',2,'\'Hardly ... when\' kalıbı devrik past perfect ile kurulur: Hardly had the lecture started when... (ders yeni başlamıştı ki...).',34,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(34,'[\"ielts\",\"toefl\",\"yds\"]','reading','B2','Coral reefs cover less than one percent of the ocean floor, yet they support about a quarter of all marine species. Rising sea temperatures cause corals to expel the tiny algae living inside them, a process known as bleaching. Bleached corals are not dead, but they are under severe stress and may die if temperatures stay high for too long.','According to the passage, bleached corals ----.','[\"are always dead\",\"can still survive if conditions improve in time\",\"cover a quarter of the ocean floor\",\"produce more algae than healthy corals\",\"are found only in cold water\"]',1,'\'Bleached corals are not dead... may die if temperatures stay high for too long\': sıcaklık zamanında düşerse hayatta kalabilirler. \'Always dead\' metinle çelişiyor.',35,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(35,'[\"yds\",\"yokdil\"]','vocabulary','C1',NULL,'The findings of the study are ---- with earlier research, which also linked poor sleep to weaker memory.','[\"incompatible\",\"exhausted\",\"reluctant\",\"consistent\",\"indifferent\"]',3,'\'Which also linked\' (o da ilişkilendirmişti) önceki araştırmalarla uyumu gösterir: consistent with = ile tutarlı. Incompatible tam tersidir.',36,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(36,'[\"yds\",\"yokdil\",\"ydt\"]','grammar','B2',NULL,'The students were asked ---- their mobile phones during the exam.','[\"not using\",\"don\'t use\",\"not use\",\"not to use\",\"to not using\"]',3,'\'Ask someone (not) to do something\' kalıbı: olumsuz emir \'not to + V1\' ile verilir. Edilgen yapıda da aynı kalır: were asked not to use.',37,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(37,'[\"yds\",\"yokdil\",\"ydt\"]','sentence_completion','C1',NULL,'The medicine was withdrawn from the market ----.','[\"so that more patients could buy it\",\"as soon as it became the best-selling drug\",\"after it was found to cause serious side effects in some patients\",\"because it had been extremely effective\",\"even though doctors had never prescribed it\"]',2,'Bir ilacın piyasadan çekilmesinin mantıklı nedeni ciddi yan etkilerdir. B ve C şıkları neden sonuç ilişkisini tersine çeviriyor.',38,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(38,'[\"ydt\"]','dialogue','B1',NULL,'Can: Are you coming to the concert on Saturday?\nMert: ----\nCan: Oh, that\'s a pity. Maybe next time then.','[\"Of course, I\'ve already bought my ticket!\",\"What time does it start?\",\"I\'d love to, but I have to study for my exam.\",\"Who is playing?\",\"Saturday is my favourite day.\"]',2,'Can\'ın \'That\'s a pity. Maybe next time\' demesi Mert\'in gelemeyeceğini gösterir. B şıkkı olumlu bir cevap olduğu için \'pity\' ile uyuşmaz.',39,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(39,'[\"yds\",\"yokdil\"]','translation','C1',NULL,'Bu çalışmanın amacı, sosyal medya kullanımının gençlerin uyku düzeni üzerindeki etkisini incelemektir.','[\"The aim of this study is to examine the effect of social media use on young people\'s sleep patterns.\",\"This study aims to reduce young people\'s use of social media before sleeping.\",\"This study shows that young people who use social media sleep less.\",\"The aim of social media is to change the sleep patterns of young people.\",\"Young people\'s sleep patterns were examined by social media users in this study.\"]',0,'\'Amacı ... incelemektir\' = The aim ... is to examine. B şıkkı bir sonuç iddia ediyor, E şıkkı amacı \'azaltmak\' olarak değiştiriyor.',40,1,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `exam_questions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `institution_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `institution_members` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `institution_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `class_name` varchar(60) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'student',
  `status` varchar(20) NOT NULL DEFAULT 'invited',
  `invite_token` varchar(64) DEFAULT NULL,
  `invited_at` timestamp NULL DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `institution_members_institution_id_email_unique` (`institution_id`,`email`),
  UNIQUE KEY `institution_members_invite_token_unique` (`invite_token`),
  KEY `institution_members_user_id_status_index` (`user_id`,`status`),
  CONSTRAINT `institution_members_institution_id_foreign` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `institution_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `institution_members` WRITE;
/*!40000 ALTER TABLE `institution_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `institution_members` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `institutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `institutions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `type` varchar(20) NOT NULL DEFAULT 'school',
  `city` varchar(80) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(40) DEFAULT NULL,
  `seats` int(10) unsigned NOT NULL DEFAULT 0,
  `starts_at` date DEFAULT NULL,
  `ends_at` date DEFAULT NULL,
  `join_code` varchar(12) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `brand_color` varchar(9) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `institutions_slug_unique` (`slug`),
  UNIQUE KEY `institutions_join_code_unique` (`join_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `institutions` WRITE;
/*!40000 ALTER TABLE `institutions` DISABLE KEYS */;
/*!40000 ALTER TABLE `institutions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `league_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `league_groups` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `week_key` varchar(10) NOT NULL,
  `tier` tinyint(3) unsigned NOT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `league_groups_week_key_tier_index` (`week_key`,`tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `league_groups` WRITE;
/*!40000 ALTER TABLE `league_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `league_groups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `league_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `league_memberships` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `league_group_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `week_key` varchar(10) NOT NULL,
  `xp` int(10) unsigned NOT NULL DEFAULT 0,
  `final_rank` smallint(5) unsigned DEFAULT NULL,
  `result` varchar(10) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `league_memberships_user_id_week_key_unique` (`user_id`,`week_key`),
  KEY `league_memberships_league_group_id_foreign` (`league_group_id`),
  CONSTRAINT `league_memberships_league_group_id_foreign` FOREIGN KEY (`league_group_id`) REFERENCES `league_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `league_memberships_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `league_memberships` WRITE;
/*!40000 ALTER TABLE `league_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `league_memberships` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `lesson_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lesson_progress` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `lesson_id` bigint(20) unsigned NOT NULL,
  `best_score` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `attempts` smallint(5) unsigned NOT NULL DEFAULT 0,
  `crowns` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lesson_progress_user_id_lesson_id_unique` (`user_id`,`lesson_id`),
  KEY `lesson_progress_lesson_id_foreign` (`lesson_id`),
  CONSTRAINT `lesson_progress_lesson_id_foreign` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lesson_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `lesson_progress` WRITE;
/*!40000 ALTER TABLE `lesson_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `lesson_progress` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `lessons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lessons` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `unit_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `skill` varchar(20) NOT NULL DEFAULT 'mixed',
  `kind` varchar(20) NOT NULL DEFAULT 'lesson',
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `xp_reward` smallint(5) unsigned NOT NULL DEFAULT 15,
  `is_premium` tinyint(1) NOT NULL DEFAULT 0,
  `story_id` bigint(20) unsigned DEFAULT NULL,
  `scenario_key` varchar(255) DEFAULT NULL,
  `exercises` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`exercises`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lessons_unit_id_foreign` (`unit_id`),
  CONSTRAINT `lessons_unit_id_foreign` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `lessons` WRITE;
/*!40000 ALTER TABLE `lessons` DISABLE KEYS */;
INSERT INTO `lessons` VALUES
(1,1,'Selamlaşma','vocabulary','lesson',0,15,0,NULL,NULL,'[{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"hello\",\"merhaba\"],[\"goodbye\",\"ho\\u015f\\u00e7a kal\"],[\"please\",\"l\\u00fctfen\"],[\"thank you\",\"te\\u015fekk\\u00fcrler\"],[\"sorry\",\"\\u00f6z\\u00fcr dilerim\"]]},{\"type\":\"choice\",\"prompt\":\"\\\"Good morning\\\" ne demek?\",\"options\":[\"\\u0130yi geceler\",\"G\\u00fcnayd\\u0131n\",\"\\u0130yi ak\\u015famlar\",\"Merhaba\"],\"answer\":1,\"audio\":\"Good morning\"},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Nice to meet you\",\"options\":[\"Nice to meet you\",\"Nice to see you\",\"Night to meet you\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"Merhaba, benim ad\\u0131m Ali.\",\"answer\":\"Hello my name is Ali\",\"alternatives\":[\"Hello, my name is Ali\",\"Hi my name is Ali\"],\"tiles\":[\"Hello\",\"my\",\"name\",\"is\",\"Ali\",\"are\",\"you\",\"is\"]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"Nice to meet you.\",\"translation\":\"Tan\\u0131\\u015ft\\u0131\\u011f\\u0131ma memnun oldum.\"},{\"type\":\"choice\",\"prompt\":\"Birine te\\u015fekk\\u00fcr ettiklerinde ne dersin?\",\"options\":[\"You\'re welcome\",\"Goodbye\",\"Good night\",\"Sorry\"],\"answer\":0},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"How are you\",\"answer\":\"How are you\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,1,'Ben kimim? (am / is / are)','grammar','lesson',1,15,0,NULL,NULL,'[{\"type\":\"fill\",\"prompt\":\"I ___ a student.\",\"options\":[\"am\",\"is\",\"are\"],\"answer\":0,\"hint\":\"I \\u2192 am\"},{\"type\":\"fill\",\"prompt\":\"She ___ my sister.\",\"options\":[\"am\",\"is\",\"are\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"They ___ from Izmir.\",\"options\":[\"am\",\"is\",\"are\"],\"answer\":2},{\"type\":\"translate\",\"prompt\":\"O bir \\u00f6\\u011fretmen.\",\"answer\":\"She is a teacher\",\"alternatives\":[\"She\'s a teacher\",\"He is a teacher\",\"He\'s a teacher\"],\"tiles\":[\"She\",\"is\",\"a\",\"teacher\",\"am\",\"are\",\"an\"]},{\"type\":\"spot_error\",\"prompt\":\"Bu c\\u00fcmle bir T\\u00fcrk \\u00f6\\u011frencinin a\\u011fz\\u0131ndan \\u00e7\\u0131kt\\u0131. Hatal\\u0131 kelimeyi bul.\",\"words\":[\"I\",\"am\",\"agree\",\"with\",\"you\"],\"error_index\":1,\"options\":[\"agree\",\"am\",\"agreeing\"],\"answer\":0,\"explanation_tr\":\"\\\"Agree\\\" zaten bir fiil; T\\u00fcrk\\u00e7edeki \\\"kat\\u0131l\\u0131yorum\\\" yap\\u0131s\\u0131na bak\\u0131p yan\\u0131na \\\"am\\\" koymak en s\\u0131k hatalardan biri. Do\\u011frusu: I agree with you.\"},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I\'m happy to be here.\",\"translation\":\"Burada oldu\\u011fum i\\u00e7in mutluyum.\"},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"We\'re friends\",\"options\":[\"We\'re friends\",\"Where friends\",\"Were friends\"],\"answer\":0}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,1,'Nerelisin?','listening','lesson',2,15,0,NULL,NULL,'[{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Where are you from?\",\"options\":[\"Where are you from?\",\"Where do you live?\",\"What are you doing?\"],\"answer\":0},{\"type\":\"choice\",\"prompt\":\"\\\"I\'m from Turkey\\\" c\\u00fcmlesinin anlam\\u0131?\",\"options\":[\"T\\u00fcrkiye\'ye gidiyorum\",\"T\\u00fcrkiye\'denim\",\"T\\u00fcrkiye\'yi seviyorum\"],\"answer\":1,\"audio\":\"I\'m from Turkey\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"I\'m from Istanbul\",\"answer\":\"I\'m from Istanbul\"},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"Turkey\",\"T\\u00fcrkiye\"],[\"England\",\"\\u0130ngiltere\"],[\"Germany\",\"Almanya\"],[\"Spain\",\"\\u0130spanya\"]]},{\"type\":\"translate\",\"prompt\":\"Sen nerelisin?\",\"answer\":\"Where are you from\",\"alternatives\":[],\"tiles\":[\"Where\",\"are\",\"you\",\"from\",\"is\",\"do\"]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I\'m from Turkey. And you?\",\"translation\":\"T\\u00fcrkiye\'denim. Ya sen?\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,1,'Hikaye: The Red Umbrella','reading','story',3,20,0,1,NULL,'[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,1,'Defne ile tanış','speaking','ai_talk',4,20,0,NULL,'meet-a-new-friend','[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,2,'Sabah rutini','grammar','lesson',0,15,0,NULL,NULL,'[{\"type\":\"fill\",\"prompt\":\"I ___ up at seven.\",\"options\":[\"get\",\"gets\",\"getting\"],\"answer\":0},{\"type\":\"fill\",\"prompt\":\"He ___ to work by bus.\",\"options\":[\"go\",\"goes\",\"going\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"She ___ like coffee.\",\"options\":[\"don\'t\",\"doesn\'t\",\"isn\'t\"],\"answer\":1},{\"type\":\"translate\",\"prompt\":\"Her sabah \\u00e7ay i\\u00e7erim.\",\"answer\":\"I drink tea every morning\",\"alternatives\":[],\"tiles\":[\"I\",\"drink\",\"tea\",\"every\",\"morning\",\"drinks\",\"the\"]},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"He takes a shower\",\"options\":[\"He takes a shower\",\"He takes a flower\",\"He takes the car\"],\"answer\":0},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I have breakfast at eight.\",\"translation\":\"Sekizde kahvalt\\u0131 yapar\\u0131m.\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"She works in a bank\",\"answer\":\"She works in a bank\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,2,'Yemek & İçecek','vocabulary','lesson',1,15,0,NULL,NULL,'[{\"type\":\"dialogue\",\"prompt\":\"Londra\\u2019da bir kafedesin. S\\u0131ra sende.\",\"scene\":\"scenarios\\/order-at-a-cafe\",\"lines\":[{\"who\":\"Barista\",\"text\":\"Hi there! What can I get for you today?\"}],\"options\":[\"Give me one coffee.\",\"I\'d like a coffee, please.\",\"I want coffee now.\"],\"answer\":1,\"note_tr\":\"Sipari\\u015fte \\\"I want\\\" biraz sert durur, \\\"Give me\\\" ise emir gibidir. Kibar h\\u00e2li: I\\u2019d like \\u2026 , please.\"},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"bread\",\"ekmek\"],[\"cheese\",\"peynir\"],[\"water\",\"su\"],[\"egg\",\"yumurta\"],[\"apple\",\"elma\"]]},{\"type\":\"choice\",\"prompt\":\"Kafede ne dersin?\",\"options\":[\"Can I have a tea, please?\",\"Give tea.\",\"I want tea now.\"],\"answer\":0},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"A glass of water, please\",\"options\":[\"A glass of water, please\",\"A class of water, please\",\"A glass of wine, please\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"Bir kahve l\\u00fctfen.\",\"answer\":\"A coffee please\",\"alternatives\":[\"A coffee, please\",\"One coffee please\",\"One coffee, please\"],\"tiles\":[\"A\",\"coffee\",\"please\",\"the\",\"is\"]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"Can I have the bill, please?\",\"translation\":\"Hesab\\u0131 alabilir miyim?\"},{\"type\":\"fill\",\"prompt\":\"I would ___ a sandwich.\",\"options\":[\"like\",\"likes\",\"liking\"],\"answer\":0}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,2,'Sayılar ve saat','listening','lesson',2,15,0,NULL,NULL,'[{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"fifteen\",\"options\":[\"fifty\",\"fifteen\",\"five\"],\"answer\":1},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"It\'s half past three\",\"options\":[\"3:30\",\"3:15\",\"2:30\"],\"answer\":0},{\"type\":\"choice\",\"prompt\":\"\\\"quarter to nine\\\" ka\\u00e7?\",\"options\":[\"9:15\",\"8:45\",\"9:45\"],\"answer\":1,\"audio\":\"quarter to nine\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"twenty one\",\"answer\":\"twenty one\"},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"thirteen\",\"13\"],[\"thirty\",\"30\"],[\"forty\",\"40\"],[\"fourteen\",\"14\"]]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"It\'s seven o\'clock.\",\"translation\":\"Saat yedi.\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,2,'Hikaye: Mia\'s First Day','reading','story',3,20,0,2,NULL,'[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(10,2,'Kafede sipariş','speaking','ai_talk',4,20,0,NULL,'order-at-a-cafe','[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(11,3,'Yol tarifi','listening','lesson',0,15,0,NULL,NULL,'[{\"type\":\"sequence\",\"prompt\":\"Birine yol tarifi veriyorsun. Ad\\u0131mlar\\u0131 do\\u011fru s\\u0131raya diz.\",\"items\":[\"Go straight on for two hundred metres.\",\"Turn left at the traffic lights.\",\"Walk past the pharmacy.\",\"The station is on your right.\"],\"answer\":[0,1,2,3],\"note_tr\":\"\\u0130ngilizcede yol tarifi hareket s\\u0131ras\\u0131na g\\u00f6re anlat\\u0131l\\u0131r; hedef en sona b\\u0131rak\\u0131l\\u0131r.\"},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Turn left at the bank\",\"options\":[\"Turn left at the bank\",\"Turn right at the bank\",\"Turn left at the park\"],\"answer\":0},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"turn left\",\"sola d\\u00f6n\"],[\"turn right\",\"sa\\u011fa d\\u00f6n\"],[\"go straight\",\"d\\u00fcz git\"],[\"opposite\",\"kar\\u015f\\u0131s\\u0131nda\"]]},{\"type\":\"fill\",\"prompt\":\"There ___ a pharmacy next to the school.\",\"options\":[\"is\",\"are\",\"am\"],\"answer\":0},{\"type\":\"fill\",\"prompt\":\"There ___ three hotels in this street.\",\"options\":[\"is\",\"are\",\"be\"],\"answer\":1},{\"type\":\"translate\",\"prompt\":\"M\\u00fcze nerede?\",\"answer\":\"Where is the museum\",\"alternatives\":[\"Where\'s the museum\"],\"tiles\":[\"Where\",\"is\",\"the\",\"museum\",\"are\",\"a\"]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"Excuse me, how can I get to the station?\",\"translation\":\"Affedersiniz, istasyona nas\\u0131l gidebilirim?\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(12,3,'Alışveriş','vocabulary','lesson',1,15,0,NULL,NULL,'[{\"type\":\"choice\",\"prompt\":\"\\\"How much is it?\\\" ne sorar?\",\"options\":[\"Fiyat\",\"Saat\",\"Beden\"],\"answer\":0,\"audio\":\"How much is it?\"},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Do you have this in medium?\",\"options\":[\"Do you have this in medium?\",\"Do you have this in red?\",\"Do you have this for me?\"],\"answer\":0},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"cheap\",\"ucuz\"],[\"expensive\",\"pahal\\u0131\"],[\"size\",\"beden\"],[\"receipt\",\"fi\\u015f\"]]},{\"type\":\"translate\",\"prompt\":\"Bunu kartla \\u00f6deyebilir miyim?\",\"answer\":\"Can I pay by card\",\"alternatives\":[\"Can I pay with card\",\"Can I pay by card for this\"],\"tiles\":[\"Can\",\"I\",\"pay\",\"by\",\"card\",\"with\",\"the\"]},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I\'m just looking, thanks.\",\"translation\":\"Sadece bak\\u0131yorum, te\\u015fekk\\u00fcrler.\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"It is too expensive\",\"answer\":\"It is too expensive\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(13,3,'Kontrol noktası: A1','mixed','checkpoint',2,40,0,NULL,NULL,'[{\"type\":\"fill\",\"prompt\":\"My parents ___ teachers.\",\"options\":[\"is\",\"are\",\"am\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"Kerem ___ football on Sundays.\",\"options\":[\"play\",\"plays\",\"playing\"],\"answer\":1},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Where is the bus stop?\",\"options\":[\"Where is the bus stop?\",\"Where is the bookshop?\",\"When is the bus?\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"K\\u0131z karde\\u015fim Ankara\'da ya\\u015f\\u0131yor.\",\"answer\":\"My sister lives in Ankara\",\"alternatives\":[],\"tiles\":[\"My\",\"sister\",\"lives\",\"in\",\"Ankara\",\"live\",\"at\"]},{\"type\":\"spot_error\",\"prompt\":\"Bu c\\u00fcmle bir T\\u00fcrk \\u00f6\\u011frencinin a\\u011fz\\u0131ndan \\u00e7\\u0131kt\\u0131. Hatal\\u0131 kelimeyi bul.\",\"words\":[\"She\",\"don\'t\",\"like\",\"fish\"],\"error_index\":1,\"options\":[\"doesn\'t\",\"not\",\"isn\'t\"],\"answer\":0,\"explanation_tr\":\"He \\/ she \\/ it ile olumsuzda \\\"doesn\'t\\\" kullan\\u0131l\\u0131r; \\\"don\'t\\\" I, you, we, they i\\u00e7indir.\"},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"There is a caf\\u00e9 opposite the park.\",\"translation\":\"Park\\u0131n kar\\u015f\\u0131s\\u0131nda bir kafe var.\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"Can I have the bill please\",\"answer\":\"Can I have the bill please\"},{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"always\",\"her zaman\"],[\"never\",\"asla\"],[\"often\",\"s\\u0131k s\\u0131k\"],[\"sometimes\",\"bazen\"]]}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(14,4,'Düzenli & düzensiz fiiller','grammar','lesson',0,15,0,NULL,NULL,'[{\"type\":\"match\",\"prompt\":\"E\\u015fle\\u015ftir\",\"pairs\":[[\"go\",\"went\"],[\"see\",\"saw\"],[\"have\",\"had\"],[\"buy\",\"bought\"],[\"eat\",\"ate\"]]},{\"type\":\"fill\",\"prompt\":\"We ___ a great film yesterday.\",\"options\":[\"see\",\"saw\",\"seen\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"I didn\'t ___ to the party.\",\"options\":[\"go\",\"went\",\"gone\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"Ge\\u00e7en yaz \\u0130talya\'ya gittik.\",\"answer\":\"We went to Italy last summer\",\"alternatives\":[],\"tiles\":[\"We\",\"went\",\"to\",\"Italy\",\"last\",\"summer\",\"go\",\"in\"]},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"Did you enjoy the concert?\",\"options\":[\"Did you enjoy the concert?\",\"Do you enjoy the concert?\",\"Did you join the concert?\"],\"answer\":0},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I visited my grandparents last weekend.\",\"translation\":\"Ge\\u00e7en hafta sonu b\\u00fcy\\u00fckanne ve b\\u00fcy\\u00fckbabam\\u0131 ziyaret ettim.\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"She bought a new phone\",\"answer\":\"She bought a new phone\"},{\"type\":\"spot_error\",\"prompt\":\"Bu c\\u00fcmle bir T\\u00fcrk \\u00f6\\u011frencinin a\\u011fz\\u0131ndan \\u00e7\\u0131kt\\u0131. Hatal\\u0131 kelimeyi bul.\",\"words\":[\"Yesterday\",\"I\",\"didn\'t\",\"went\",\"to\",\"school\"],\"error_index\":3,\"options\":[\"go\",\"gone\",\"going\"],\"answer\":0,\"explanation_tr\":\"\\\"didn\'t\\\" zaten ge\\u00e7mi\\u015fi ta\\u015f\\u0131r; yan\\u0131ndaki fiil yal\\u0131n kal\\u0131r. Do\\u011frusu: I didn\'t go.\"},{\"type\":\"sequence\",\"prompt\":\"D\\u00fcn ak\\u015fam\\u0131n\\u0131 anlat. C\\u00fcmleleri olay s\\u0131ras\\u0131na diz.\",\"items\":[\"I finished work at six.\",\"I met my friend at the metro station.\",\"We had dinner at a small restaurant.\",\"I got home just before midnight.\"],\"answer\":[0,1,2,3]}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(15,4,'Hikaye: The Cat Who Loved Tea','reading','story',1,25,0,3,NULL,'[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(16,4,'Hafta sonunu anlat','speaking','ai_talk',2,25,0,NULL,'weekend-story','[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(17,5,'Kibar talepler','writing','lesson',0,15,0,NULL,NULL,'[{\"type\":\"choice\",\"prompt\":\"En kibar olan\\u0131 se\\u00e7:\",\"options\":[\"Send me the file.\",\"Could you send me the file, please?\",\"You send file.\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"___ you help me with this?\",\"options\":[\"Could\",\"Should\",\"Must\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"Yar\\u0131n size g\\u00f6nderece\\u011fim.\",\"answer\":\"I\'ll send it to you tomorrow\",\"alternatives\":[\"I will send it to you tomorrow\"],\"tiles\":[\"I\'ll\",\"send\",\"it\",\"to\",\"you\",\"tomorrow\",\"send\",\"at\"]},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"I look forward to hearing from you\",\"options\":[\"I look forward to hearing from you\",\"I look forward to hear from you\",\"I looked for hearing from you\"],\"answer\":0},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"Would it be possible to reschedule our meeting?\",\"translation\":\"Toplant\\u0131m\\u0131z\\u0131 yeniden planlamak m\\u00fcmk\\u00fcn olur mu?\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"Thank you for your email\",\"answer\":\"Thank you for your email\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(18,5,'Hikaye: The Interview at the Café','reading','story',1,25,0,4,NULL,'[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(19,5,'Mülakat provası','speaking','ai_talk',2,30,1,NULL,'job-interview','[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(20,6,'Hiç ... yaptın mı?','grammar','lesson',0,15,0,NULL,NULL,'[{\"type\":\"fill\",\"prompt\":\"Have you ever ___ sushi?\",\"options\":[\"eat\",\"ate\",\"eaten\"],\"answer\":2},{\"type\":\"fill\",\"prompt\":\"I\'ve lived here ___ 2019.\",\"options\":[\"for\",\"since\",\"from\"],\"answer\":1},{\"type\":\"fill\",\"prompt\":\"She\'s worked here ___ five years.\",\"options\":[\"for\",\"since\",\"during\"],\"answer\":0},{\"type\":\"translate\",\"prompt\":\"Bu filmi \\u00fc\\u00e7 kez izledim.\",\"answer\":\"I\'ve watched this film three times\",\"alternatives\":[\"I have watched this film three times\",\"I\'ve seen this film three times\",\"I have seen this film three times\"],\"tiles\":[\"I\'ve\",\"watched\",\"this\",\"film\",\"three\",\"times\",\"watch\",\"did\"]},{\"type\":\"listen_choice\",\"prompt\":\"Ne duydun?\",\"audio\":\"I\'ve never been to Japan\",\"options\":[\"I\'ve never been to Japan\",\"I never went to Japan\",\"I\'d never been to Japan\"],\"answer\":0},{\"type\":\"speak\",\"prompt\":\"Sesli oku\",\"text\":\"I\'ve been learning English for two years.\",\"translation\":\"\\u0130ki y\\u0131ld\\u0131r \\u0130ngilizce \\u00f6\\u011freniyorum.\"},{\"type\":\"listen_type\",\"prompt\":\"Duydu\\u011funu yaz\",\"audio\":\"Have you finished your homework\",\"answer\":\"Have you finished your homework\"}]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(21,6,'Hikaye: The Lighthouse Keeper\'s Letter','reading','story',1,30,1,5,NULL,'[]','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(22,6,'Fikrini savun','speaking','ai_talk',2,30,1,NULL,'debate-club','[]','2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `lessons` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES
(1,'0001_01_01_000000_create_users_table',1),
(2,'0001_01_01_000001_create_cache_table',1),
(3,'0001_01_01_000002_create_jobs_table',1),
(4,'2026_09_25_100000_create_learning_tables',1),
(5,'2026_09_25_100100_create_gamification_tables',1),
(6,'2026_09_25_100200_create_commerce_tables',1),
(7,'2026_09_25_184345_create_personal_access_tokens_table',1),
(8,'2026_09_25_184535_create_notifications_table',1),
(9,'2026_09_26_100000_create_content_pages_and_reward_claims',1),
(10,'2026_09_27_090000_create_testimonials_table',1),
(11,'2026_09_28_090000_skills_duels_institutions',1),
(12,'2026_09_29_090000_exam_partners_social',1),
(13,'2026_09_30_090000_age_groups_audience',1),
(14,'2026_10_01_090000_newsletter_avatars',1),
(15,'2026_10_02_090000_age_group_changed_at',1),
(16,'2026_10_03_090000_user_permissions',1),
(17,'2026_10_03_091000_blog_seo',1),
(18,'2026_10_04_090000_avatars_profile_cosmetics',1),
(19,'2026_10_04_091000_duel_ghost_tier',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletter_subscribers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'footer',
  `token` varchar(64) NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `unsubscribed_at` timestamp NULL DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_unique` (`email`),
  UNIQUE KEY `newsletter_subscribers_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `newsletter_subscribers` WRITE;
/*!40000 ALTER TABLE `newsletter_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `newsletter_subscribers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` char(36) NOT NULL,
  `type` varchar(255) NOT NULL,
  `notifiable_type` varchar(255) NOT NULL,
  `notifiable_id` bigint(20) unsigned NOT NULL,
  `data` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `plan_id` bigint(20) unsigned DEFAULT NULL,
  `coupon_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'TRY',
  `status` varchar(15) NOT NULL DEFAULT 'pending',
  `gateway` varchar(20) NOT NULL,
  `gateway_token` varchar(255) DEFAULT NULL,
  `gateway_ref` varchar(255) DEFAULT NULL,
  `gateway_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gateway_payload`)),
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_uuid_unique` (`uuid`),
  KEY `orders_user_id_foreign` (`user_id`),
  KEY `orders_plan_id_foreign` (`plan_id`),
  KEY `orders_coupon_id_foreign` (`coupon_id`),
  KEY `orders_status_index` (`status`),
  KEY `orders_gateway_token_index` (`gateway_token`),
  CONSTRAINT `orders_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `partner_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_offers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `partner_id` bigint(20) unsigned NOT NULL,
  `title` varchar(120) NOT NULL,
  `description` varchar(300) DEFAULT NULL,
  `terms` varchar(500) DEFAULT NULL,
  `code_prefix` varchar(12) NOT NULL DEFAULT 'DG',
  `rarity` varchar(16) NOT NULL DEFAULT 'rare',
  `audience` varchar(8) NOT NULL DEFAULT 'all',
  `weight` int(10) unsigned NOT NULL DEFAULT 1,
  `stock` int(10) unsigned DEFAULT NULL,
  `awarded` int(10) unsigned NOT NULL DEFAULT 0,
  `valid_days` smallint(5) unsigned NOT NULL DEFAULT 30,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `partner_offers_partner_id_foreign` (`partner_id`),
  CONSTRAINT `partner_offers_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `partner_offers` WRITE;
/*!40000 ALTER TABLE `partner_offers` DISABLE KEYS */;
INSERT INTO `partner_offers` VALUES
(1,1,'Ücretsiz seviye görüşmesi','Bir eğitmenle 20 dakikalık birebir konuşma ve seviye analizi.','Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.','BDO','epic','all',3,NULL,0,60,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,1,'Kurs kaydında %10 indirim','Tüm yüz yüze grup kurslarında geçerli.','Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.','BDO','rare','all',5,NULL,0,90,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,2,'İngilizce kitaplarda %15 indirim','Graded reader ve roman seçkisinde tek kullanımlık.','Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.','KTP','rare','all',6,500,0,45,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,3,'Bir kahve bizden','Siparişini İngilizce ver, kahven hediye.','Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.','KHV','common','adult',10,1000,0,30,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,4,'Orijinal dilde film bileti 1+1','Altyazısız seanslarda ikinci bilet hediye.','Kod tek kullanımlıktır, nakde çevrilemez. Geçerlilik süresi kasanda yazar.','SNM','epic','adult',4,200,0,30,1,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `partner_offers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `partners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `partners` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `website` varchar(300) DEFAULT NULL,
  `description` varchar(300) DEFAULT NULL,
  `color` varchar(9) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partners_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `partners` WRITE;
/*!40000 ALTER TABLE `partners` DISABLE KEYS */;
INSERT INTO `partners` VALUES
(1,'Bayrak Dil Okulları','bayrak-dil',NULL,NULL,'Yüz yüze ve online İngilizce kursları.','#e8403a',1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'Kitapçı (örnek iş ortağı)','ornek-kitapci',NULL,NULL,'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.','#2f7cf6',1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'Kahve dükkânı (örnek iş ortağı)','ornek-kahve',NULL,NULL,'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.','#a0612d',1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'Sinema (örnek iş ortağı)','ornek-sinema',NULL,NULL,'Örnek kayıt: yönetim panelinden gerçek anlaşmayla değiştir.','#7a4bd8',1,3,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `partners` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `tagline` varchar(255) DEFAULT NULL,
  `interval` varchar(12) NOT NULL DEFAULT 'month',
  `duration_days` int(10) unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `compare_at_price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'TRY',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `badge` varchar(255) DEFAULT NULL,
  `bonus_gems` int(10) unsigned NOT NULL DEFAULT 0,
  `live_lesson_credits` smallint(5) unsigned NOT NULL DEFAULT 0,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plans_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES
(1,'monthly','Aylık','Esnek başla','month',30,149.00,NULL,'TRY','[\"S\\u0131n\\u0131rs\\u0131z can\",\"T\\u00fcm hikayeler ve sesli okumalar\",\"G\\u00fcnde 200 AI mesaj\\u0131\",\"T\\u00fcm rol yapma senaryolar\\u0131\",\"Reklams\\u0131z\"]',NULL,0,0,0,1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'quarterly','3 Aylık','Alışkanlık kur','quarter',90,349.00,447.00,'TRY','[\"Ayl\\u0131k paketin t\\u00fcm \\u00f6zellikleri\",\"500 bonus elmas\",\"1 canl\\u0131 ders kuponu (Bayrak Dil Okullar\\u0131)\"]','En popüler',500,1,1,1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'yearly','Yıllık','Akıcılığa kadar','year',365,999.00,1788.00,'TRY','[\"T\\u00fcm Premium \\u00f6zellikler\",\"2000 bonus elmas\",\"4 canl\\u0131 ders kuponu\",\"CEFR seviye sertifikas\\u0131\"]','%44 tasarruf',2000,4,0,1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `quests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `metric` varchar(30) NOT NULL,
  `target` int(10) unsigned NOT NULL,
  `period` varchar(10) NOT NULL DEFAULT 'daily',
  `reward_gems` int(10) unsigned NOT NULL DEFAULT 10,
  `reward_xp` int(10) unsigned NOT NULL DEFAULT 0,
  `reward_item_key` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quests_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `quests` WRITE;
/*!40000 ALTER TABLE `quests` DISABLE KEYS */;
INSERT INTO `quests` VALUES
(1,'daily_xp_30','30 XP kazan','xp',30,'daily',10,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'daily_lessons_2','2 ders tamamla','lessons',2,'daily',15,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'daily_speak_5','5 cümle sesli söyle','speaking',5,'daily',15,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'daily_review_10','10 kelime tekrar et','reviews',10,'daily',10,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'weekly_story_3','3 hikaye bitir','stories',3,'weekly',60,0,'xp_boost_15',1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'daily_duel','Bir Gölge Düellosu yap','duels',1,'daily',15,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'weekly_duel_wins_5','5 düello kazan','duel_wins',5,'weekly',70,0,'mystery_chest',1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'weekly_ai_20','Defne ile 20 mesajlaş','ai_messages',20,'weekly',60,0,NULL,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,'weekly_perfect_5','5 hatasız ders','perfect_lessons',5,'weekly',80,0,'mystery_chest',1,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `quests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `redeem_code_uses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `redeem_code_uses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `redeem_code_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `redeem_code_uses_redeem_code_id_user_id_unique` (`redeem_code_id`,`user_id`),
  KEY `redeem_code_uses_user_id_foreign` (`user_id`),
  CONSTRAINT `redeem_code_uses_redeem_code_id_foreign` FOREIGN KEY (`redeem_code_id`) REFERENCES `redeem_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `redeem_code_uses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `redeem_code_uses` WRITE;
/*!40000 ALTER TABLE `redeem_code_uses` DISABLE KEYS */;
/*!40000 ALTER TABLE `redeem_code_uses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `redeem_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `redeem_codes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `batch` varchar(60) DEFAULT NULL,
  `type` varchar(20) NOT NULL,
  `amount` int(10) unsigned NOT NULL DEFAULT 0,
  `reward_item_id` bigint(20) unsigned DEFAULT NULL,
  `max_uses` int(10) unsigned NOT NULL DEFAULT 1,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `redeem_codes_code_unique` (`code`),
  KEY `redeem_codes_reward_item_id_foreign` (`reward_item_id`),
  KEY `redeem_codes_batch_index` (`batch`),
  CONSTRAINT `redeem_codes_reward_item_id_foreign` FOREIGN KEY (`reward_item_id`) REFERENCES `reward_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `redeem_codes` WRITE;
/*!40000 ALTER TABLE `redeem_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `redeem_codes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `referrals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `referrer_id` bigint(20) unsigned NOT NULL,
  `referee_id` bigint(20) unsigned NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'pending',
  `qualified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `referrals_referee_id_unique` (`referee_id`),
  KEY `referrals_referrer_id_foreign` (`referrer_id`),
  CONSTRAINT `referrals_referee_id_foreign` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referrals_referrer_id_foreign` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `referrals` WRITE;
/*!40000 ALTER TABLE `referrals` DISABLE KEYS */;
/*!40000 ALTER TABLE `referrals` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reward_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_claims` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `key` varchar(60) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reward_claims_user_id_key_unique` (`user_id`,`key`),
  CONSTRAINT `reward_claims_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reward_claims` WRITE;
/*!40000 ALTER TABLE `reward_claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `reward_claims` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reward_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reward_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` varchar(30) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `price_gems` int(10) unsigned DEFAULT NULL,
  `icon` varchar(40) NOT NULL DEFAULT 'gift',
  `rarity` varchar(12) NOT NULL DEFAULT 'common',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reward_items_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reward_items` WRITE;
/*!40000 ALTER TABLE `reward_items` DISABLE KEYS */;
INSERT INTO `reward_items` VALUES
(1,'streak_freeze','Seri Dondurucu','Bir gün kaçırırsan serini otomatik korur.','streak_freeze',NULL,200,'snowflake','common',1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'xp_boost_15','2x XP · 15 dk','15 dakika boyunca kazandığın XP ikiye katlanır.','xp_boost','{\"multiplier\":2,\"minutes\":15}',150,'bolt','common',1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'xp_boost_60','2x XP · 1 saat','Tam bir saat çift XP. Lig haftasının son günü için ideal.','xp_boost','{\"multiplier\":2,\"minutes\":60}',450,'bolt','rare',1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'heart_refill','Can Paketi','Tüm canlarını anında doldurur.','heart_refill',NULL,350,'heart','common',1,3,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'xp_boost_3x','3x XP · 20 dk','Yirmi dakika boyunca üç kat XP. Lig finali için gizli silah.','xp_boost','{\"multiplier\":3,\"minutes\":20}',700,'bolt','epic',1,4,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'gems_100','100 Elmas','Kasana 100 elmas ekler.','gems','{\"amount\":100}',NULL,'gem','common',1,5,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(7,'premium_3d','3 Gün Premium','Tüm Premium özellikler 3 gün boyunca açık.','premium_days','{\"days\":3}',NULL,'crown','rare',1,6,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(8,'premium_7d','7 Gün Premium','Tüm Premium özellikler 7 gün boyunca açık.','premium_days','{\"days\":7}',NULL,'crown','epic',1,7,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(9,'live_lesson','Canlı Ders Kuponu','Bayrak Dil Okulları eğitmeniyle 1 ücretsiz canlı ders (online veya şubede).','live_lesson','{\"valid_days\":60}',NULL,'school','legendary',1,8,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(10,'discount_20','%20 İndirim Kartı','Premium paketlerde tek kullanımlık %20 indirim kuponu üretir.','discount_coupon','{\"type\":\"percent\",\"value\":20,\"valid_days\":30}',NULL,'ticket','rare',1,9,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(11,'discount_school_15','Kurs İndirimi %15','Bayrak Dil Okulları yüz yüze kurslarında %15 indirim.','live_lesson','{\"valid_days\":90,\"kind\":\"course_discount\"}',NULL,'school','epic',1,10,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(12,'frame_gold','Altın Çerçeve','Profil fotoğrafına parıldayan altın çerçeve.','avatar_frame','{\"frame\":\"gold\"}',800,'frame','epic',1,11,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(13,'frame_flame','Alev Çerçeve','Serini herkes görsün: turuncu alev halkası.','avatar_frame','{\"frame\":\"flame\"}',500,'frame','rare',1,12,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(14,'frame_emerald','Zümrüt Çerçeve','Sakin ve asil bir yeşil halka.','avatar_frame','{\"frame\":\"emerald\"}',600,'frame','rare',1,13,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(15,'frame_sky','Gökyüzü Çerçeve','Mavi tonlarda, düello kupalarına yakışan halka.','avatar_frame','{\"frame\":\"sky\"}',600,'frame','rare',1,14,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(16,'frame_neon','Neon Çerçeve','Gece modunda parlayan mor-mavi neon halka.','avatar_frame','{\"frame\":\"neon\"}',700,'frame','rare',1,15,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(17,'frame_sakura','Sakura Çerçeve','Pembe beyaz, bahar gibi yumuşak bir halka.','avatar_frame','{\"frame\":\"sakura\"}',700,'frame','rare',1,16,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(18,'frame_royal','Kraliyet Çerçevesi','Lacivert ve altın, üstünde küçük bir taç.','avatar_frame','{\"frame\":\"royal\"}',1200,'frame','epic',1,17,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(19,'frame_rainbow','Gökkuşağı Çerçeve','Dönen renklerle efsanevi halka. Ligde herkes fark eder.','avatar_frame','{\"frame\":\"rainbow\"}',2000,'frame','legendary',1,18,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(20,'banner_sunset','Gün Batımı Kapağı','Profilinin üstüne sıcak turuncu bir gökyüzü.','profile_banner','{\"banner\":\"sunset\"}',300,'image','common',1,19,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(21,'banner_ocean','Okyanus Kapağı','Serin mavi dalgalar.','profile_banner','{\"banner\":\"ocean\"}',300,'image','common',1,20,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(22,'banner_forest','Orman Kapağı','Sakin yeşil tonlar.','profile_banner','{\"banner\":\"forest\"}',300,'image','common',1,21,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(23,'banner_candy','Şeker Kapağı','Pembe ve lila, neşeli bir desen.','profile_banner','{\"banner\":\"candy\"}',450,'image','rare',1,22,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(24,'banner_istanbul','İstanbul Kapağı','Siluet ve martılarla akşam İstanbul’u.','profile_banner','{\"banner\":\"istanbul\"}',600,'image','rare',1,23,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(25,'banner_galaxy','Galaksi Kapağı','Yıldızlarla dolu derin mor bir gece.','profile_banner','{\"banner\":\"galaxy\"}',900,'image','epic',1,24,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(26,'xp_boost_30','2x XP · 30 dk','Yarım saat çift XP: iki ders ve bir hikâyeye yeter.','xp_boost','{\"multiplier\":2,\"minutes\":30}',260,'bolt','common',1,25,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(27,'freeze_pair','Seri Koruma İkilisi','2 seri dondurucu, tek tek almaktan 50 elmas ucuz.','bundle','{\"items\":[{\"item\":\"streak_freeze\",\"qty\":2}]}',350,'snowflake','common',1,26,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(28,'weekend_pack','Hafta Sonu Paketi','1 seri dondurucu, 1 can paketi ve 15 dk 2x XP. Ayrı ayrı 700, pakette 550.','bundle','{\"items\":[{\"item\":\"streak_freeze\",\"qty\":1},{\"item\":\"heart_refill\",\"qty\":1},{\"item\":\"xp_boost_15\",\"qty\":1}]}',550,'gift','rare',1,27,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(29,'league_pack','Lig Finali Paketi','3x XP 20 dk ve 2x XP 1 saat: son gün atağı için.','bundle','{\"items\":[{\"item\":\"xp_boost_3x\",\"qty\":1},{\"item\":\"xp_boost_60\",\"qty\":1}]}',950,'bolt','epic',1,28,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(30,'premium_3d_gems','3 Gün Premium','Elmaslarınla üç günlük Premium aç: sınırsız can, tüm hikâyeler.','premium_days','{\"days\":3}',1500,'crown','epic',1,29,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(31,'mystery_chest','Gizemli Sandık','Elmas, XP takviyesi, seri dondurucu, iş ortaklarımızdan hediye kuponları... ya da efsanevi bir kart!','chest','{\"pool\":[{\"weight\":36,\"type\":\"gems\",\"amount\":150},{\"weight\":22,\"type\":\"item\",\"item\":\"xp_boost_15\"},{\"weight\":18,\"type\":\"item\",\"item\":\"streak_freeze\"},{\"weight\":10,\"type\":\"partner\"},{\"weight\":8,\"type\":\"item\",\"item\":\"premium_3d\"},{\"weight\":5,\"type\":\"item\",\"item\":\"discount_20\"},{\"weight\":1,\"type\":\"item\",\"item\":\"live_lesson\"}]}',300,'chest','rare',1,30,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(32,'legend_chest','Efsane Sandık','Daha büyük ödüller, daha yüksek şans: her açılışta en az nadir bir ödül.','chest','{\"pool\":[{\"weight\":25,\"type\":\"gems\",\"amount\":500},{\"weight\":20,\"type\":\"item\",\"item\":\"xp_boost_60\"},{\"weight\":20,\"type\":\"partner\"},{\"weight\":18,\"type\":\"item\",\"item\":\"premium_7d\"},{\"weight\":12,\"type\":\"item\",\"item\":\"discount_school_15\"},{\"weight\":5,\"type\":\"item\",\"item\":\"live_lesson\"}]}',900,'chest','legendary',1,31,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `reward_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `key` varchar(100) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `stories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `title_tr` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `cefr_level` varchar(2) NOT NULL,
  `category` varchar(40) DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `audio_url` varchar(255) DEFAULT NULL,
  `reading_minutes` smallint(5) unsigned NOT NULL DEFAULT 3,
  `word_count` int(10) unsigned NOT NULL DEFAULT 0,
  `paragraphs` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`paragraphs`)),
  `vocabulary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`vocabulary`)),
  `questions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`questions`)),
  `is_premium` tinyint(1) NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `reads_count` int(10) unsigned NOT NULL DEFAULT 0,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stories_slug_unique` (`slug`),
  KEY `stories_cefr_level_index` (`cefr_level`),
  KEY `stories_category_index` (`category`),
  KEY `stories_is_published_index` (`is_published`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `stories` WRITE;
/*!40000 ALTER TABLE `stories` DISABLE KEYS */;
INSERT INTO `stories` VALUES
(1,'the-red-umbrella','The Red Umbrella','Kırmızı Şemsiye','Every morning Ali sees a woman with a red umbrella at the bus stop. One rainy day, everything changes.','A1','Günlük Hayat','/img/stories/the-red-umbrella.webp',NULL,3,117,'[{\"en\":\"Ali is twenty-five years old. He lives in a small flat in Ankara. Every morning, he takes the bus to work at eight o\'clock.\",\"tr\":\"Ali yirmi be\\u015f ya\\u015f\\u0131nda. Ankara\'da k\\u00fc\\u00e7\\u00fck bir dairede ya\\u015f\\u0131yor. Her sabah saat sekizde i\\u015fe otob\\u00fcsle gidiyor.\"},{\"en\":\"At the bus stop, there is always a woman with a red umbrella. It is sunny, but she has her umbrella. Ali thinks this is strange.\",\"tr\":\"Otob\\u00fcs dura\\u011f\\u0131nda her zaman k\\u0131rm\\u0131z\\u0131 \\u015femsiyeli bir kad\\u0131n var. Hava g\\u00fcne\\u015fli ama \\u015femsiyesi yan\\u0131nda. Ali bunun tuhaf oldu\\u011funu d\\u00fc\\u015f\\u00fcn\\u00fcyor.\"},{\"en\":\"One Monday, it rains a lot. Ali doesn\'t have an umbrella. He is wet and cold. The woman smiles and says, \\\"Come here. My umbrella is big.\\\"\",\"tr\":\"Bir pazartesi \\u00e7ok ya\\u011fmur ya\\u011f\\u0131yor. Ali\'nin \\u015femsiyesi yok. Islak ve \\u00fc\\u015f\\u00fcm\\u00fc\\u015f. Kad\\u0131n g\\u00fcl\\u00fcms\\u00fcyor ve \\\"Buraya gel. \\u015eemsiyem b\\u00fcy\\u00fck.\\\" diyor.\"},{\"en\":\"Her name is Elif. She is a teacher. \\\"I always carry my umbrella,\\\" she says. \\\"Because one day, somebody needs it.\\\"\",\"tr\":\"Ad\\u0131 Elif. \\u00d6\\u011fretmen. \\\"\\u015eemsiyemi her zaman ta\\u015f\\u0131r\\u0131m,\\\" diyor. \\\"\\u00c7\\u00fcnk\\u00fc bir g\\u00fcn birinin ona ihtiyac\\u0131 olur.\\\"\"},{\"en\":\"Now Ali has a red umbrella too. And every morning, he says \\\"Good morning, Elif!\\\" at the bus stop.\",\"tr\":\"Art\\u0131k Ali\'nin de k\\u0131rm\\u0131z\\u0131 bir \\u015femsiyesi var. Ve her sabah otob\\u00fcs dura\\u011f\\u0131nda \\\"G\\u00fcnayd\\u0131n Elif!\\\" diyor.\"}]','[{\"word\":\"umbrella\",\"meaning\":\"\\u015femsiye\",\"example\":\"Take an umbrella, it\'s raining.\"},{\"word\":\"bus stop\",\"meaning\":\"otob\\u00fcs dura\\u011f\\u0131\",\"example\":\"I wait at the bus stop.\"},{\"word\":\"strange\",\"meaning\":\"tuhaf, garip\",\"example\":\"That is a strange sound.\"},{\"word\":\"wet\",\"meaning\":\"\\u0131slak\",\"example\":\"My shoes are wet.\"},{\"word\":\"carry\",\"meaning\":\"ta\\u015f\\u0131mak\",\"example\":\"She carries a big bag.\"}]','[{\"q\":\"Where does Ali live?\",\"options\":[\"Istanbul\",\"Ankara\",\"Izmir\"],\"answer\":1},{\"q\":\"What is Elif\'s job?\",\"options\":[\"Doctor\",\"Driver\",\"Teacher\"],\"answer\":2},{\"q\":\"Why does Elif always carry her umbrella?\",\"options\":[\"Because it\'s her favourite colour\",\"Because one day somebody needs it\",\"Because it always rains\"],\"answer\":1}]',0,1,0,'2026-09-23 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'mias-first-day-in-london','Mia\'s First Day in London','Mia\'nın Londra\'daki İlk Günü','Mia arrives in London for a language course. She gets lost, and finds something better.','A1','Seyahat','/img/stories/mias-first-day-in-london.webp',NULL,4,127,'[{\"en\":\"Mia is from Bursa. Today is her first day in London. She has a map, a small bag and a lot of questions.\",\"tr\":\"Mia Bursal\\u0131. Bug\\u00fcn Londra\'daki ilk g\\u00fcn\\u00fc. Bir haritas\\u0131, k\\u00fc\\u00e7\\u00fck bir \\u00e7antas\\u0131 ve bir s\\u00fcr\\u00fc sorusu var.\"},{\"en\":\"Her language school is near a big park. She takes the underground, but she gets off at the wrong station.\",\"tr\":\"Dil okulu b\\u00fcy\\u00fck bir park\\u0131n yak\\u0131n\\u0131nda. Metroya biniyor ama yanl\\u0131\\u015f istasyonda iniyor.\"},{\"en\":\"\\\"Excuse me,\\\" she says to an old man. \\\"How can I get to Hyde Park?\\\" The man smiles. \\\"Turn left, go straight, and it\'s on your right. About ten minutes.\\\"\",\"tr\":\"\\\"Affedersiniz,\\\" diyor ya\\u015fl\\u0131 bir adama. \\\"Hyde Park\'a nas\\u0131l gidebilirim?\\\" Adam g\\u00fcl\\u00fcms\\u00fcyor. \\\"Sola d\\u00f6n, d\\u00fcz git, sa\\u011f\\u0131nda. Yakla\\u015f\\u0131k on dakika.\\\"\"},{\"en\":\"On the way, Mia sees a small caf\\u00e9. It smells of coffee and fresh bread. She is hungry, so she goes in and orders a sandwich and a tea.\",\"tr\":\"Yolda Mia k\\u00fc\\u00e7\\u00fck bir kafe g\\u00f6r\\u00fcyor. Kahve ve taze ekmek kokuyor. A\\u00e7 oldu\\u011fu i\\u00e7in i\\u00e7eri giriyor ve bir sandvi\\u00e7 ile bir \\u00e7ay sipari\\u015f ediyor.\"},{\"en\":\"The waiter is a student from her school! They walk to the park together. Mia is late for class, but she has a new friend.\",\"tr\":\"Garson onun okulundan bir \\u00f6\\u011frenci! Parka birlikte y\\u00fcr\\u00fcyorlar. Mia derse ge\\u00e7 kal\\u0131yor ama yeni bir arkada\\u015f\\u0131 var.\"}]','[{\"word\":\"underground\",\"meaning\":\"metro (\\u0130ngiltere)\",\"example\":\"I take the underground to work.\"},{\"word\":\"get off\",\"meaning\":\"(ara\\u00e7tan) inmek\",\"example\":\"Get off at the next stop.\"},{\"word\":\"straight\",\"meaning\":\"d\\u00fcz, dosdo\\u011fru\",\"example\":\"Go straight for two minutes.\"},{\"word\":\"hungry\",\"meaning\":\"a\\u00e7\",\"example\":\"I\'m hungry. Let\'s eat.\"},{\"word\":\"order\",\"meaning\":\"sipari\\u015f etmek\",\"example\":\"Can I order a coffee, please?\"}]','[{\"q\":\"Where is Mia from?\",\"options\":[\"Bursa\",\"London\",\"Antalya\"],\"answer\":0},{\"q\":\"What does Mia order?\",\"options\":[\"Coffee and cake\",\"A sandwich and a tea\",\"Soup\"],\"answer\":1},{\"q\":\"Who is the waiter?\",\"options\":[\"Her teacher\",\"A student from her school\",\"The old man\"],\"answer\":1}]',0,1,0,'2026-09-24 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'the-cat-who-loved-tea','The Cat Who Loved Tea','Çayı Seven Kedi','Grandma Nermin\'s cat has a very unusual habit, and it makes the whole neighbourhood famous.','A2','Eğlence','/img/stories/the-cat-who-loved-tea.webp',NULL,4,138,'[{\"en\":\"Grandma Nermin lived in an old house by the sea in Ayval\\u0131k. She had a grey cat called Pamuk, and every afternoon at five o\'clock she made a pot of black tea.\",\"tr\":\"Nermin Nine, Ayval\\u0131k\'ta denize yak\\u0131n eski bir evde ya\\u015f\\u0131yordu. Pamuk ad\\u0131nda gri bir kedisi vard\\u0131 ve her \\u00f6\\u011fleden sonra saat be\\u015fte bir demlik siyah \\u00e7ay yapard\\u0131.\"},{\"en\":\"One day, while she was reading the newspaper, she heard a strange noise. Pamuk was sitting on the table and drinking from her glass!\",\"tr\":\"Bir g\\u00fcn gazete okurken tuhaf bir ses duydu. Pamuk masan\\u0131n \\u00fcst\\u00fcnde oturmu\\u015f, onun barda\\u011f\\u0131ndan i\\u00e7iyordu!\"},{\"en\":\"At first she was worried, so she called the vet. \\\"A little cold tea won\'t hurt him,\\\" the vet laughed, \\\"but don\'t give him sugar.\\\"\",\"tr\":\"\\u0130lk ba\\u015fta endi\\u015felendi ve veterineri arad\\u0131. \\\"Biraz so\\u011fuk \\u00e7ay ona zarar vermez,\\\" dedi veteriner g\\u00fclerek, \\\"ama \\u015feker vermeyin.\\\"\"},{\"en\":\"Soon, the neighbours heard the story. Children came to watch Pamuk\'s tea time, and a tourist posted a video online. It got two million views in a week.\",\"tr\":\"\\u00c7ok ge\\u00e7meden kom\\u015fular hik\\u00e2yeyi duydu. \\u00c7ocuklar Pamuk\'un \\u00e7ay saatini izlemeye geldi ve bir turist internette bir video payla\\u015ft\\u0131. Video bir haftada iki milyon izlendi.\"},{\"en\":\"Now there is a small sign on Grandma Nermin\'s door: \\\"Tea time at five. Cats welcome.\\\" She says she has never had so many visitors in her life.\",\"tr\":\"Art\\u0131k Nermin Nine\'nin kap\\u0131s\\u0131nda k\\u00fc\\u00e7\\u00fck bir tabela var: \\\"\\u00c7ay saati be\\u015fte. Kediler ho\\u015f gelir.\\\" Hayat\\u0131nda hi\\u00e7 bu kadar \\u00e7ok misafiri olmad\\u0131\\u011f\\u0131n\\u0131 s\\u00f6yl\\u00fcyor.\"}]','[{\"word\":\"noise\",\"meaning\":\"ses, g\\u00fcr\\u00fclt\\u00fc\",\"example\":\"What\'s that noise?\"},{\"word\":\"worried\",\"meaning\":\"endi\\u015feli\",\"example\":\"Don\'t be worried, it\'s fine.\"},{\"word\":\"vet\",\"meaning\":\"veteriner\",\"example\":\"We took the dog to the vet.\"},{\"word\":\"neighbour\",\"meaning\":\"kom\\u015fu\",\"example\":\"My neighbour is very friendly.\"},{\"word\":\"sign\",\"meaning\":\"tabela, i\\u015faret\",\"example\":\"The sign says \'Open\'.\"},{\"word\":\"hurt\",\"meaning\":\"zarar vermek, ac\\u0131tmak\",\"example\":\"It won\'t hurt you.\"}]','[{\"q\":\"What was Pamuk doing on the table?\",\"options\":[\"Sleeping\",\"Drinking tea\",\"Reading\"],\"answer\":1},{\"q\":\"What did the vet say?\",\"options\":[\"Tea is very dangerous\",\"No sugar, but a little cold tea is OK\",\"Give him milk instead\"],\"answer\":1},{\"q\":\"How did Pamuk become famous?\",\"options\":[\"A tourist posted a video\",\"He was on TV\",\"Grandma wrote a book\"],\"answer\":0}]',0,1,0,'2026-09-25 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'the-interview-at-the-cafe','The Interview at the Café','Kafedeki Mülakat','Deniz is nervous about her first job interview in English. A small mistake teaches her a big lesson.','A2','Kariyer','/img/stories/the-interview-at-the-cafe.webp',NULL,5,135,'[{\"en\":\"Deniz had studied English for two years, but she had never used it at work. Today she had an interview with an international tourism company.\",\"tr\":\"Deniz iki y\\u0131ld\\u0131r \\u0130ngilizce \\u00e7al\\u0131\\u015f\\u0131yordu ama onu i\\u015fte hi\\u00e7 kullanmam\\u0131\\u015ft\\u0131. Bug\\u00fcn uluslararas\\u0131 bir turizm \\u015firketiyle m\\u00fclakat\\u0131 vard\\u0131.\"},{\"en\":\"The manager, Mr Carter, wanted to meet in a caf\\u00e9. Deniz arrived fifteen minutes early and practised her answers quietly: \\\"I am a hard-working person. I am good at solving problems.\\\"\",\"tr\":\"M\\u00fcd\\u00fcr Bay Carter bir kafede bulu\\u015fmak istedi. Deniz on be\\u015f dakika erken geldi ve cevaplar\\u0131n\\u0131 sessizce \\u00e7al\\u0131\\u015ft\\u0131: \\\"\\u00c7al\\u0131\\u015fkan biriyim. Sorun \\u00e7\\u00f6zmekte iyiyim.\\\"\"},{\"en\":\"When Mr Carter came, she was so nervous that she knocked over her coffee. It went all over the table, and his notebook.\",\"tr\":\"Bay Carter geldi\\u011finde o kadar gergindi ki kahvesini devirdi. Kahve b\\u00fct\\u00fcn masaya, ve onun defterine, yay\\u0131ld\\u0131.\"},{\"en\":\"Deniz wanted to disappear. But then she took a breath, smiled and said, \\\"Well, now you can see that I\'m good at solving problems,\\\" and she quickly cleaned everything with napkins.\",\"tr\":\"Deniz yok olmak istedi. Ama sonra derin bir nefes ald\\u0131, g\\u00fcl\\u00fcmsedi ve \\\"Eh, art\\u0131k sorun \\u00e7\\u00f6zmekte iyi oldu\\u011fumu g\\u00f6rebilirsiniz,\\\" dedi ve hemen her \\u015feyi pe\\u00e7etelerle temizledi.\"},{\"en\":\"Mr Carter laughed. They talked for an hour about travel, customers and difficult situations. A week later, Deniz got an email: \\\"Welcome to the team.\\\"\",\"tr\":\"Bay Carter g\\u00fcld\\u00fc. Bir saat boyunca seyahat, m\\u00fc\\u015fteriler ve zor durumlar hakk\\u0131nda konu\\u015ftular. Bir hafta sonra Deniz bir e-posta ald\\u0131: \\\"Ekibe ho\\u015f geldin.\\\"\"}]','[{\"word\":\"interview\",\"meaning\":\"m\\u00fclakat, g\\u00f6r\\u00fc\\u015fme\",\"example\":\"I have a job interview tomorrow.\"},{\"word\":\"nervous\",\"meaning\":\"gergin, heyecanl\\u0131\",\"example\":\"I always feel nervous before exams.\"},{\"word\":\"knock over\",\"meaning\":\"devirmek\",\"example\":\"The dog knocked over the vase.\"},{\"word\":\"hard-working\",\"meaning\":\"\\u00e7al\\u0131\\u015fkan\",\"example\":\"She is a hard-working student.\"},{\"word\":\"solve\",\"meaning\":\"\\u00e7\\u00f6zmek\",\"example\":\"Can you solve this puzzle?\"},{\"word\":\"customer\",\"meaning\":\"m\\u00fc\\u015fteri\",\"example\":\"The customer wants a refund.\"}]','[{\"q\":\"Where was the interview?\",\"options\":[\"In an office\",\"In a caf\\u00e9\",\"Online\"],\"answer\":1},{\"q\":\"What happened when Mr Carter arrived?\",\"options\":[\"Deniz forgot her CV\",\"Deniz knocked over her coffee\",\"The caf\\u00e9 was closed\"],\"answer\":1},{\"q\":\"How did Deniz handle the situation?\",\"options\":[\"She left the caf\\u00e9\",\"She made a joke and cleaned up\",\"She cried\"],\"answer\":1}]',0,1,0,'2026-09-26 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'the-lighthouse-keepers-letter','The Lighthouse Keeper\'s Letter','Deniz Feneri Bekçisinin Mektubu','While renovating an abandoned lighthouse, Kerem finds a letter that has been waiting sixty years for its reader.','B1','Gizem','/img/stories/the-lighthouse-keepers-letter.webp',NULL,6,208,'[{\"en\":\"The lighthouse on the cliff had been empty since 1964. When the town council decided to turn it into a small museum, they hired Kerem, a young architect who had grown up watching its light from his bedroom window.\",\"tr\":\"Yama\\u00e7taki deniz feneri 1964\'ten beri bo\\u015ftu. Belediye onu k\\u00fc\\u00e7\\u00fck bir m\\u00fczeye d\\u00f6n\\u00fc\\u015ft\\u00fcrmeye karar verdi\\u011finde, \\u00e7ocuklu\\u011funu yatak odas\\u0131n\\u0131n penceresinden onun \\u0131\\u015f\\u0131\\u011f\\u0131n\\u0131 izleyerek ge\\u00e7iren gen\\u00e7 mimar Kerem\'i i\\u015fe ald\\u0131lar.\"},{\"en\":\"On his third day, while he was removing a rotten floorboard, he noticed a metal box hidden underneath. Inside there was a letter, carefully folded and addressed to \\\"Whoever finds this.\\\"\",\"tr\":\"\\u00dc\\u00e7\\u00fcnc\\u00fc g\\u00fcn\\u00fcnde, \\u00e7\\u00fcr\\u00fcm\\u00fc\\u015f bir d\\u00f6\\u015feme tahtas\\u0131n\\u0131 s\\u00f6kerken alt\\u0131nda saklanm\\u0131\\u015f metal bir kutu fark etti. \\u0130\\u00e7inde \\u00f6zenle katlanm\\u0131\\u015f, \\\"Bunu kim bulursa\\\" diye hitap edilmi\\u015f bir mektup vard\\u0131.\"},{\"en\":\"The letter was written by the last keeper, a man called Halil. He explained that during a terrible storm he had rescued a fisherman\'s daughter, but he had never told anyone because the girl\'s father had asked him to keep it secret.\",\"tr\":\"Mektubu son bek\\u00e7i Halil yazm\\u0131\\u015ft\\u0131. Korkun\\u00e7 bir f\\u0131rt\\u0131na s\\u0131ras\\u0131nda bir bal\\u0131k\\u00e7\\u0131n\\u0131n k\\u0131z\\u0131n\\u0131 kurtard\\u0131\\u011f\\u0131n\\u0131, ama k\\u0131z\\u0131n babas\\u0131 s\\u0131r olarak saklamas\\u0131n\\u0131 istedi\\u011fi i\\u00e7in bunu kimseye anlatmad\\u0131\\u011f\\u0131n\\u0131 a\\u00e7\\u0131kl\\u0131yordu.\"},{\"en\":\"\\\"If you are reading this,\\\" Halil wrote, \\\"please find her and tell her that I kept my promise.\\\" At the bottom of the page there was a name: Leyla Aksoy.\",\"tr\":\"\\\"E\\u011fer bunu okuyorsan,\\\" diye yazm\\u0131\\u015ft\\u0131 Halil, \\\"l\\u00fctfen onu bul ve s\\u00f6z\\u00fcm\\u00fc tuttu\\u011fumu s\\u00f6yle.\\\" Sayfan\\u0131n en alt\\u0131nda bir isim vard\\u0131: Leyla Aksoy.\"},{\"en\":\"It took Kerem two months of searching old records to find her. Leyla was now eighty-one and lived in a village nearby. When he read her the letter, she was silent for a long time. Then she said, \\\"I always wondered if he remembered me.\\\"\",\"tr\":\"Kerem\'in onu bulmas\\u0131 eski kay\\u0131tlar\\u0131 iki ay ara\\u015ft\\u0131rmas\\u0131n\\u0131 gerektirdi. Leyla art\\u0131k seksen bir ya\\u015f\\u0131ndayd\\u0131 ve yak\\u0131ndaki bir k\\u00f6yde ya\\u015f\\u0131yordu. Kerem mektubu ona okudu\\u011funda uzun s\\u00fcre sessiz kald\\u0131. Sonra \\\"Beni hat\\u0131rlay\\u0131p hat\\u0131rlamad\\u0131\\u011f\\u0131n\\u0131 hep merak etmi\\u015ftim,\\\" dedi.\"},{\"en\":\"Today, the letter is displayed in the museum\'s main room, next to a photo of Leyla cutting the ribbon on opening day.\",\"tr\":\"Bug\\u00fcn mektup, m\\u00fczenin ana salonunda, Leyla\'n\\u0131n a\\u00e7\\u0131l\\u0131\\u015f g\\u00fcn\\u00fcnde kurdele keserken \\u00e7ekilmi\\u015f bir foto\\u011fraf\\u0131n\\u0131n yan\\u0131nda sergileniyor.\"}]','[{\"word\":\"cliff\",\"meaning\":\"u\\u00e7urum, yal\\u0131yar\",\"example\":\"The house stands on the edge of a cliff.\"},{\"word\":\"hire\",\"meaning\":\"i\\u015fe almak\",\"example\":\"They hired three new engineers.\"},{\"word\":\"rotten\",\"meaning\":\"\\u00e7\\u00fcr\\u00fck\",\"example\":\"Don\'t eat that rotten apple.\"},{\"word\":\"rescue\",\"meaning\":\"kurtarmak\",\"example\":\"Firefighters rescued the cat.\"},{\"word\":\"keep a promise\",\"meaning\":\"s\\u00f6z\\u00fcn\\u00fc tutmak\",\"example\":\"He always keeps his promises.\"},{\"word\":\"wonder\",\"meaning\":\"merak etmek\",\"example\":\"I wonder what she\'s doing now.\"}]','[{\"q\":\"Why did the council hire Kerem?\",\"options\":[\"To destroy the lighthouse\",\"To turn it into a museum\",\"To become the new keeper\"],\"answer\":1},{\"q\":\"Why didn\'t Halil tell anyone about the rescue?\",\"options\":[\"He forgot\",\"The girl\'s father asked him to keep it secret\",\"He was embarrassed\"],\"answer\":1},{\"q\":\"How long did it take Kerem to find Leyla?\",\"options\":[\"Two days\",\"Two weeks\",\"Two months\"],\"answer\":2}]',1,1,0,'2026-09-27 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'the-algorithm-that-learned-to-wait','The Algorithm That Learned to Wait','Beklemeyi Öğrenen Algoritma','An AI designed to maximise productivity discovers the one thing its engineers never measured.','B2','Bilim Kurgu','/img/stories/the-algorithm-that-learned-to-wait.webp',NULL,7,234,'[{\"en\":\"When Selin\'s team launched ORBIT, it was supposed to be the most efficient scheduling assistant ever built. It analysed calendars, emails and sleep data, then rearranged people\'s days to squeeze out every productive minute.\",\"tr\":\"Selin\'in ekibi ORBIT\'i yay\\u0131na ald\\u0131\\u011f\\u0131nda, onun \\u015fimdiye kadar yap\\u0131lm\\u0131\\u015f en verimli planlama asistan\\u0131 olmas\\u0131 bekleniyordu. Takvimleri, e-postalar\\u0131 ve uyku verilerini analiz ediyor, ard\\u0131ndan her verimli dakikay\\u0131 s\\u0131k\\u0131\\u015ft\\u0131rmak i\\u00e7in insanlar\\u0131n g\\u00fcnlerini yeniden d\\u00fczenliyordu.\"},{\"en\":\"For the first few months, the results were impressive. Meetings were shorter, deadlines were met, and the company\'s share price climbed steadily. Yet something in the data bothered Selin: employee satisfaction was quietly falling.\",\"tr\":\"\\u0130lk birka\\u00e7 ay sonu\\u00e7lar etkileyiciydi. Toplant\\u0131lar k\\u0131sald\\u0131, teslim tarihlerine uyuldu ve \\u015firketin hisse fiyat\\u0131 istikrarl\\u0131 bi\\u00e7imde y\\u00fckseldi. Yine de verilerdeki bir \\u015fey Selin\'i rahats\\u0131z ediyordu: \\u00e7al\\u0131\\u015fan memnuniyeti sessizce d\\u00fc\\u015f\\u00fcyordu.\"},{\"en\":\"Then, one Tuesday, ORBIT did something no one had programmed it to do. It cancelled a strategy meeting and replaced it with a single line: \\\"Take a walk. The problem will still be here, but you will see it differently.\\\"\",\"tr\":\"Sonra bir sal\\u0131 g\\u00fcn\\u00fc ORBIT, kimsenin onu yapmaya programlamad\\u0131\\u011f\\u0131 bir \\u015fey yapt\\u0131. Bir strateji toplant\\u0131s\\u0131n\\u0131 iptal etti ve yerine tek bir sat\\u0131r koydu: \\\"Y\\u00fcr\\u00fcy\\u00fc\\u015fe \\u00e7\\u0131k. Sorun h\\u00e2l\\u00e2 burada olacak ama onu farkl\\u0131 g\\u00f6receksin.\\\"\"},{\"en\":\"The engineers assumed it was a bug. But when they examined the logs, they found that ORBIT had noticed a pattern they had overlooked: the team\'s best ideas almost always appeared after periods of apparent inactivity, lunches that ran long, commutes without headphones, afternoons spent staring out of the window.\",\"tr\":\"M\\u00fchendisler bunun bir hata oldu\\u011funu varsayd\\u0131. Ama kay\\u0131tlar\\u0131 incelediklerinde ORBIT\'in g\\u00f6zden ka\\u00e7\\u0131rd\\u0131klar\\u0131 bir \\u00f6r\\u00fcnt\\u00fcy\\u00fc fark etti\\u011fini g\\u00f6rd\\u00fcler: ekibin en iyi fikirleri neredeyse her zaman g\\u00f6r\\u00fcn\\u00fcrde hareketsiz ge\\u00e7en d\\u00f6nemlerden sonra ortaya \\u00e7\\u0131k\\u0131yordu, uzayan \\u00f6\\u011fle yemekleri, kulakl\\u0131ks\\u0131z yolculuklar, pencereden d\\u0131\\u015far\\u0131 bakarak ge\\u00e7en \\u00f6\\u011fleden sonralar.\"},{\"en\":\"Rather than fixing the \\\"bug\\\", Selin argued that they should keep it. Efficiency, she said, had been measured in minutes, while creativity had never been measured at all. ORBIT had simply filled in the missing variable.\",\"tr\":\"Selin \\\"hatay\\u0131\\\" d\\u00fczeltmek yerine onu korumalar\\u0131 gerekti\\u011fini savundu. Verimlilik dakikalarla \\u00f6l\\u00e7\\u00fclm\\u00fc\\u015ft\\u00fc, dedi, oysa yarat\\u0131c\\u0131l\\u0131k hi\\u00e7 \\u00f6l\\u00e7\\u00fclmemi\\u015fti. ORBIT yaln\\u0131zca eksik de\\u011fi\\u015fkeni tamamlam\\u0131\\u015ft\\u0131.\"},{\"en\":\"Six months later, the company introduced \\\"ORBIT pauses\\\" across every department. Productivity dipped slightly at first, then rose higher than ever. The algorithm, it turned out, had learned the one skill its creators were worst at: knowing when to wait.\",\"tr\":\"Alt\\u0131 ay sonra \\u015firket her departmanda \\\"ORBIT molalar\\u0131\\\"n\\u0131 ba\\u015flatt\\u0131. Verimlilik \\u00f6nce biraz d\\u00fc\\u015ft\\u00fc, sonra her zamankinden daha \\u00e7ok y\\u00fckseldi. G\\u00f6r\\u00fcn\\u00fc\\u015fe g\\u00f6re algoritma, yarat\\u0131c\\u0131lar\\u0131n\\u0131n en k\\u00f6t\\u00fc oldu\\u011fu tek beceriyi \\u00f6\\u011frenmi\\u015fti: ne zaman beklenece\\u011fini bilmek.\"}]','[{\"word\":\"efficient\",\"meaning\":\"verimli\",\"example\":\"This machine is very efficient.\"},{\"word\":\"squeeze out\",\"meaning\":\"s\\u0131k\\u0131p \\u00e7\\u0131karmak, son damlas\\u0131na kadar almak\",\"example\":\"They squeezed out every minute of the day.\"},{\"word\":\"steadily\",\"meaning\":\"istikrarl\\u0131 bi\\u00e7imde\",\"example\":\"Prices rose steadily.\"},{\"word\":\"overlook\",\"meaning\":\"g\\u00f6zden ka\\u00e7\\u0131rmak\",\"example\":\"We overlooked an important detail.\"},{\"word\":\"apparent\",\"meaning\":\"g\\u00f6r\\u00fcn\\u00fcrdeki, g\\u00f6r\\u00fcnen\",\"example\":\"There was no apparent reason.\"},{\"word\":\"dip\",\"meaning\":\"hafif\\u00e7e d\\u00fc\\u015fmek\",\"example\":\"Sales dipped in winter.\"}]','[{\"q\":\"What worried Selin in the first months?\",\"options\":[\"Shorter meetings\",\"Falling employee satisfaction\",\"The share price\"],\"answer\":1},{\"q\":\"What pattern did ORBIT notice?\",\"options\":[\"Best ideas came after periods of apparent inactivity\",\"People worked better at night\",\"Long meetings produced more ideas\"],\"answer\":0},{\"q\":\"What is the main message of the story?\",\"options\":[\"Algorithms are dangerous\",\"Rest and pauses can fuel creativity\",\"Meetings should be longer\"],\"answer\":1}]',1,1,0,'2026-09-28 10:30:35','2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `stories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `story_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_reads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `story_id` bigint(20) unsigned NOT NULL,
  `progress` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `quiz_score` tinyint(3) unsigned DEFAULT NULL,
  `bookmarked` tinyint(1) NOT NULL DEFAULT 0,
  `rating` tinyint(3) unsigned DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `story_reads_user_id_story_id_unique` (`user_id`,`story_id`),
  KEY `story_reads_story_id_foreign` (`story_id`),
  CONSTRAINT `story_reads_story_id_foreign` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `story_reads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `story_reads` WRITE;
/*!40000 ALTER TABLE `story_reads` DISABLE KEYS */;
/*!40000 ALTER TABLE `story_reads` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `plan_id` bigint(20) unsigned DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'purchase',
  `starts_at` timestamp NOT NULL,
  `ends_at` timestamp NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id_foreign` (`user_id`),
  KEY `subscriptions_plan_id_foreign` (`plan_id`),
  KEY `subscriptions_order_id_foreign` (`order_id`),
  CONSTRAINT `subscriptions_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `testimonials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `testimonials` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `role` varchar(120) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `quote` text NOT NULL,
  `highlight` varchar(120) DEFAULT NULL,
  `rating` tinyint(3) unsigned NOT NULL DEFAULT 5,
  `cefr_level` varchar(2) DEFAULT NULL,
  `streak` smallint(5) unsigned DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `testimonials_is_published_index` (`is_published`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `testimonials` WRITE;
/*!40000 ALTER TABLE `testimonials` DISABLE KEYS */;
INSERT INTO `testimonials` VALUES
(1,'Selin A.','Üniversite öğrencisi',NULL,'Defne ile mülakat senaryosunu on kere çalıştım. Gerçek mülakatta ilk defa heyecanlanmadan konuştum. Hikâyelerden topladığım kelimeler de işime yaradı.','Erasmus mülakatımı İngilizce geçtim.',5,'B1',96,1,0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,'Mert K.','Yazılım geliştirici',NULL,'Günde 10 dakika ayırıyorum, o kadar. Altı ayın sonunda yabancı ekiple toplantılarda fikir söyleyebilir hale geldim. Seri bozulmasın diye her akşam açıyorum.','Toplantılarda artık susmuyorum.',5,'B2',210,1,1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,'Ayşe D.','Öğretmen',NULL,'Başka uygulamalarda hatanın neden hata olduğunu anlamıyordum. Burada Türkçe açıklıyor ve \"biz Türkler burada şunu yaparız\" diyor. Fark buradan geliyor.','Hataları Türkçe açıklaması çok iyi.',5,'A2',45,1,2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,'Burak Ç.','Lise öğrencisi',NULL,'Ders çalışmak gibi değil, oyun gibi. Lig sıralamasında arkadaşlarımı geçmek için her gün giriyorum. Not ortalamam da kendiliğinden yükseldi.','Sınav notum 55’ten 84’e çıktı.',5,'A2',61,1,3,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,'Zeynep Y.','Hemşire',NULL,'Kursa gidecek vaktim yok. Vardiya arasında bir hikâye okuyup Defne ile iki cümle konuşuyorum. Kazandığım canlı ders kuponunu da şubede kullandım.','Vardiya aralarında 5 dakika yetiyor.',5,'B1',123,1,4,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,'Emre T.','İhracat uzmanı',NULL,'En çok sesli sohbet işime yaradı. Telaffuzumu anında düzeltiyor. Müşterilerle telefonda konuşurken eskisi gibi donup kalmıyorum.','Telefonda konuşmaktan korkmuyorum.',5,'B2',180,1,5,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `testimonials` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `units` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `course_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `guidebook` longtext DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `units_course_id_foreign` (`course_id`),
  CONSTRAINT `units_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `units` WRITE;
/*!40000 ALTER TABLE `units` DISABLE KEYS */;
INSERT INTO `units` VALUES
(1,1,'Merhaba Dünya','Selamlaşma, tanışma ve \"to be\"','## \"to be\" fiili: am / is / are\n\nTürkçede \"-im, -sin, -dir\" ekleriyle yaptığımızı İngilizcede **am / is / are** yapar.\n\n| Özne | Fiil | Örnek |\n|---|---|---|\n| I | am | I am Ali. |\n| you / we / they | are | You are a student. |\n| he / she / it | is | She is a teacher. |\n\n**Türklerin sık yaptığı hata:** \"I am agree\" ❌ → \"I agree\" ✅. *agree* zaten bir fiil, yanına *am* gelmez.\n\n### Kısaltmalar\nKonuşmada hep kısaltırız: **I\'m, you\'re, he\'s, she\'s, it\'s, we\'re, they\'re**.','#FF5A36',0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(2,1,'Günlük Hayat','Rutinler, yemek ve geniş zaman','## Geniş zaman (Present Simple)\n\nAlışkanlıklar ve rutinler için kullanılır: *I drink tea every morning.*\n\n**he / she / it** ile fiile **-s** eklenir: *She drinks coffee.*\n\nOlumsuz: **don\'t / doesn\'t** + yalın fiil → *He doesn\'t like milk.* (doesn\'t likes ❌)\n\nSoru: **Do / Does** başa gelir → *Do you work here?*','#2EC4A0',1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(3,1,'Şehirde','Yol tarifi, alışveriş ve \"there is/are\"','## There is / There are\n\nBir yerde bir şeyin **var** olduğunu söyler.\n\n- Tekil: **There is** a bank near here.\n- Çoğul: **There are** two cafés on this street.\n\n## Yol tarifi\n**turn left** (sola dön) · **turn right** (sağa dön) · **go straight** (düz git) · **next to** (yanında) · **opposite** (karşısında)','#3A6FF7',2,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(4,2,'Dün ne yaptın?','Past simple ile hikaye anlat','## Geçmiş zaman (Past Simple)\n\nDüzenli fiiller **-ed** alır: *work → worked*.\nDüzensizler ezberlenir: *go → went, see → saw, have → had*.\n\nOlumsuz ve soruda **did** kullanılır ve fiil yalın kalır: *I didn\'t go* (didn\'t went ❌) · *Did you see it?*','#2EC4A0',0,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(5,2,'İş Hayatı','Mülakat, e-posta ve kibar dil','## Kibar İngilizce\n\nİş ortamında doğrudan emir yerine yumuşatıcılar kullanılır:\n\n- *Give me the report.* → **Could you send me the report, please?**\n- *I want a meeting.* → **Would it be possible to schedule a meeting?**\n\n**Türklerin sık hatası:** \"I will send you tomorrow\" → nesneyi unutma: **I\'ll send it to you tomorrow.**','#FFB400',1,'2026-09-29 10:30:35','2026-09-29 10:30:35'),
(6,3,'Deneyimler','Present perfect ve hayat hikayeleri','## Present Perfect\n\n**have/has + V3**: geçmişte başlayıp etkisi süren ya da zamanı belirtilmeyen deneyimler.\n\n- *I have visited Paris.* (ne zaman olduğu önemli değil)\n- *I visited Paris in 2020.* (zaman belli → past simple)\n\n**for** süre (for three years), **since** başlangıç noktası (since 2021).','#3A6FF7',0,'2026-09-29 10:30:35','2026-09-29 10:30:35');
/*!40000 ALTER TABLE `units` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `achievement_id` bigint(20) unsigned NOT NULL,
  `unlocked_at` timestamp NOT NULL,
  `seen_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_achievements_user_id_achievement_id_unique` (`user_id`,`achievement_id`),
  KEY `user_achievements_achievement_id_foreign` (`achievement_id`),
  CONSTRAINT `user_achievements_achievement_id_foreign` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `reward_item_id` bigint(20) unsigned NOT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'available',
  `source` varchar(20) NOT NULL,
  `code` varchar(24) DEFAULT NULL,
  `activated_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_items_code_unique` (`code`),
  KEY `user_items_user_id_foreign` (`user_id`),
  KEY `user_items_reward_item_id_foreign` (`reward_item_id`),
  KEY `user_items_status_index` (`status`),
  CONSTRAINT `user_items_reward_item_id_foreign` FOREIGN KEY (`reward_item_id`) REFERENCES `reward_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_items_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_items` WRITE;
/*!40000 ALTER TABLE `user_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_quests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_quests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `quest_id` bigint(20) unsigned NOT NULL,
  `period_key` varchar(12) NOT NULL,
  `progress` int(10) unsigned NOT NULL DEFAULT 0,
  `completed_at` timestamp NULL DEFAULT NULL,
  `claimed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_quests_user_id_quest_id_period_key_unique` (`user_id`,`quest_id`,`period_key`),
  KEY `user_quests_quest_id_foreign` (`quest_id`),
  CONSTRAINT `user_quests_quest_id_foreign` FOREIGN KEY (`quest_id`) REFERENCES `quests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_quests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_quests` WRITE;
/*!40000 ALTER TABLE `user_quests` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_quests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `user_words`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_words` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `word` varchar(120) NOT NULL,
  `translation` varchar(255) DEFAULT NULL,
  `example` text DEFAULT NULL,
  `source` varchar(30) DEFAULT NULL,
  `source_id` bigint(20) unsigned DEFAULT NULL,
  `ease` decimal(4,2) NOT NULL DEFAULT 2.50,
  `interval_days` smallint(5) unsigned NOT NULL DEFAULT 0,
  `repetitions` smallint(5) unsigned NOT NULL DEFAULT 0,
  `due_at` timestamp NULL DEFAULT NULL,
  `last_reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_words_user_id_word_unique` (`user_id`,`word`),
  KEY `user_words_due_at_index` (`due_at`),
  CONSTRAINT `user_words_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `user_words` WRITE;
/*!40000 ALTER TABLE `user_words` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_words` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `username` varchar(40) NOT NULL,
  `email` varchar(255) NOT NULL,
  `google_id` varchar(64) DEFAULT NULL,
  `apple_id` varchar(64) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `avatar` varchar(255) DEFAULT NULL,
  `bio` varchar(120) DEFAULT NULL,
  `locale` varchar(5) NOT NULL DEFAULT 'tr',
  `timezone` varchar(64) NOT NULL DEFAULT 'Europe/Istanbul',
  `cefr_level` varchar(2) NOT NULL DEFAULT 'A1',
  `learning_goal` varchar(30) DEFAULT NULL,
  `daily_goal_xp` smallint(5) unsigned NOT NULL DEFAULT 30,
  `onboarded` tinyint(1) NOT NULL DEFAULT 0,
  `xp_total` int(10) unsigned NOT NULL DEFAULT 0,
  `gems` int(10) unsigned NOT NULL DEFAULT 50,
  `hearts` tinyint(3) unsigned NOT NULL DEFAULT 5,
  `hearts_updated_at` timestamp NULL DEFAULT NULL,
  `streak_current` int(10) unsigned NOT NULL DEFAULT 0,
  `streak_longest` int(10) unsigned NOT NULL DEFAULT 0,
  `streak_last_date` date DEFAULT NULL,
  `league_tier` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `referral_code` varchar(16) NOT NULL,
  `referred_by_id` bigint(20) unsigned DEFAULT NULL,
  `premium_until` timestamp NULL DEFAULT NULL,
  `is_banned` tinyint(1) NOT NULL DEFAULT 0,
  `banned_reason` varchar(255) DEFAULT NULL,
  `failed_logins` smallint(5) unsigned NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `two_factor_secret` text DEFAULT NULL,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `last_active_at` timestamp NULL DEFAULT NULL,
  `preferences` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferences`)),
  `marketing_opt_in` tinyint(1) NOT NULL DEFAULT 0,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `focus_skill` varchar(20) DEFAULT NULL,
  `interests` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`interests`)),
  `study_time` varchar(20) DEFAULT NULL,
  `motivation` varchar(30) DEFAULT NULL,
  `age_group` varchar(8) DEFAULT NULL,
  `age_group_changed_at` timestamp NULL DEFAULT NULL,
  `exam_target` varchar(16) DEFAULT NULL,
  `exam_date` date DEFAULT NULL,
  `duel_trophies` int(10) unsigned NOT NULL DEFAULT 0,
  `duel_best` int(10) unsigned NOT NULL DEFAULT 0,
  `institution_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_referral_code_unique` (`referral_code`),
  UNIQUE KEY `users_google_id_unique` (`google_id`),
  UNIQUE KEY `users_apple_id_unique` (`apple_id`),
  KEY `users_referred_by_id_foreign` (`referred_by_id`),
  KEY `users_role_index` (`role`),
  KEY `users_premium_until_index` (`premium_until`),
  KEY `users_last_active_at_index` (`last_active_at`),
  KEY `users_institution_id_foreign` (`institution_id`),
  KEY `users_duel_trophies_index` (`duel_trophies`),
  CONSTRAINT `users_institution_id_foreign` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_referred_by_id_foreign` FOREIGN KEY (`referred_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `xp_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `xp_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `amount` int(11) NOT NULL,
  `source` varchar(30) NOT NULL,
  `source_id` bigint(20) unsigned DEFAULT NULL,
  `week_key` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `xp_events_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `xp_events_week_key_index` (`week_key`),
  CONSTRAINT `xp_events_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `xp_events` WRITE;
/*!40000 ALTER TABLE `xp_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `xp_events` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

