CREATE DATABASE IF NOT EXISTS clinica_pies CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinica_pies;

-- Pacientes (datos personales)
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(32) PRIMARY KEY, -- patient-XXXXX
  nombre_encrypted TEXT NOT NULL,
  edad TINYINT UNSIGNED NOT NULL,
  sexo ENUM('M','F','Otro') NOT NULL,
  pesoKg DECIMAL(5,2) NOT NULL,
  estaturaM DECIMAL(4,2) NOT NULL,
  createdAt DATETIME NOT NULL,
  INDEX idx_patients_createdAt (createdAt)
) ENGINE=InnoDB;

-- Datos clínicos separados (uno a muchos por paciente)
CREATE TABLE IF NOT EXISTS clinical_data (
  id CHAR(36) PRIMARY KEY, -- UUID
  patientId VARCHAR(32) NOT NULL,
  antecedentes TEXT NULL,
  diagnosticoPrincipal_encrypted TEXT NULL,
  notas TEXT NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_clinical_patient FOREIGN KEY (patientId) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_clinical_patient (patientId),
  INDEX idx_clinical_createdAt (createdAt)
) ENGINE=InnoDB;

-- Consentimiento informado (al menos un registro por paciente antes de estudios)
CREATE TABLE IF NOT EXISTS consents (
  id CHAR(36) PRIMARY KEY,
  patientId VARCHAR(32) NOT NULL,
  filePath TEXT NOT NULL,
  mimeType VARCHAR(128) NOT NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_consents_patient FOREIGN KEY (patientId) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_consents_patient (patientId),
  INDEX idx_consents_createdAt (createdAt)
) ENGINE=InnoDB;

-- Estudios biomecánicos
CREATE TABLE IF NOT EXISTS studies (
  id CHAR(36) PRIMARY KEY,
  patientId VARCHAR(32) NOT NULL,
  studyUID VARCHAR(128) NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_studies_patient FOREIGN KEY (patientId) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_studies_patient (patientId),
  INDEX idx_studies_createdAt (createdAt)
) ENGINE=InnoDB;

-- Imágenes asociadas a estudios (huella plantar / vistas cámara)
CREATE TABLE IF NOT EXISTS study_images (
  id CHAR(36) PRIMARY KEY,
  studyUID VARCHAR(128) NOT NULL,
  patientId VARCHAR(32) NOT NULL,
  view ENUM('frontal','sagital','posterior') NOT NULL,
  filePath TEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_images_study FOREIGN KEY (studyUID) REFERENCES studies(studyUID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_images_patient FOREIGN KEY (patientId) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_images_study (studyUID),
  INDEX idx_images_patient (patientId),
  INDEX idx_images_view (view)
) ENGINE=InnoDB;

-- Resultados de análisis biomecánico (un registro por estudio/vista)
CREATE TABLE IF NOT EXISTS analyses (
  id CHAR(36) PRIMARY KEY,
  studyUID VARCHAR(128) NOT NULL,
  tibiofemoralAngleDeg DECIMAL(6,2) NULL,
  tibiofemoralClassification VARCHAR(32) NULL,
  chainFlexionPct DECIMAL(5,2) NULL,
  chainExtensionPct DECIMAL(5,2) NULL,
  chainAperturaPct DECIMAL(5,2) NULL,
  createdAt DATETIME NOT NULL,
  CONSTRAINT fk_analyses_study FOREIGN KEY (studyUID) REFERENCES studies(studyUID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_analyses_study (studyUID),
  INDEX idx_analyses_createdAt (createdAt)
) ENGINE=InnoDB;
