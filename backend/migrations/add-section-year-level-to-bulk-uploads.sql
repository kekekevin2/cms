-- Add section and year_level columns to organization_bulk_uploads table
ALTER TABLE organization_bulk_uploads 
ADD COLUMN IF NOT EXISTS section VARCHAR(50) NULL COMMENT 'Section for the uploaded members',
ADD COLUMN IF NOT EXISTS year_level VARCHAR(20) NULL COMMENT 'Year level for the uploaded members';
