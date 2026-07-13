-- Add semester and academic_year_id columns to cvl_attachments table
ALTER TABLE cvl_attachments 
ADD COLUMN semester VARCHAR(20) NULL COMMENT 'Semester (1st Semester, 2nd Semester, Summer)';

ALTER TABLE cvl_attachments 
ADD COLUMN academic_year_id INT NULL COMMENT 'Reference to academic year',
ADD CONSTRAINT fk_cvl_academic_year 
FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id) ON DELETE SET NULL;
