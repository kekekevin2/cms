# Requirements Document: PDS Excel Export

## Introduction

This feature enables Faculty and Dean users to export their complete Personal Data Sheet (PDS) information from the web application into a properly formatted Excel file that matches the official Philippine government PDS template (CS Form No. 212, Revised 2017). The exported file will contain all PDS sections with data mapped to specific cell positions matching the official template layout.

## Glossary

- **PDS**: Personal Data Sheet - the official government form (CS Form No. 212, Revised 2017) used to collect personal, educational, and professional information from civil service employees
- **Excel_Exporter**: The backend service component responsible for generating Excel files from PDS data
- **Template_Mapper**: The component responsible for mapping database fields to specific Excel cell positions
- **Faculty_User**: A faculty member who has filled out their PDS information in the system
- **Dean_User**: A dean who has filled out their PDS information in the system
- **PDS_Record**: A complete set of PDS data stored across multiple database tables (personal_data_sheets, pds_children, pds_education, pds_eligibility, pds_work_experiences, pds_trainings, pds_voluntary_works, pds_other_info, pds_references)
- **Official_Template**: The standardized Excel file layout matching the government PDS form structure
- **Cell_Position**: A specific Excel cell reference (e.g., D10, N12) where data should be written
- **Export_Button**: The UI control that triggers the Excel file generation and download

## Requirements

### Requirement 1: Excel File Generation

**User Story:** As a Faculty_User or Dean_User, I want to export my PDS data as an Excel file, so that I can have a properly formatted copy matching the official government template.

#### Acceptance Criteria

1. WHEN a Faculty_User or Dean_User clicks the Export_Button, THE Excel_Exporter SHALL retrieve the complete PDS_Record for that user
2. WHEN the PDS_Record is retrieved, THE Excel_Exporter SHALL generate an Excel file using the xlsx library
3. THE Excel_Exporter SHALL create the file within 5 seconds for a complete PDS_Record
4. WHEN the Excel file is generated, THE System SHALL initiate a browser download with filename format "PDS_{Surname}_{FirstName}_{YYYYMMDD}.xlsx"
5. IF the PDS_Record is incomplete or missing, THEN THE System SHALL still generate the Excel file with available data

### Requirement 2: Personal Information Mapping

**User Story:** As a Faculty_User or Dean_User, I want my personal information correctly placed in the Excel template, so that the exported file matches the official PDS format.

#### Acceptance Criteria

1. THE Template_Mapper SHALL write the surname field to cells D10 through N10
2. THE Template_Mapper SHALL write the first_name field to cells D11 through K11
3. THE Template_Mapper SHALL write the middle_name field to cells D12 through N12
4. THE Template_Mapper SHALL write the date_of_birth field to cells D13 through F13 in MM/DD/YYYY format
5. THE Template_Mapper SHALL write the place_of_birth field to cells H13 through N13
6. THE Template_Mapper SHALL write the height field to cells D22 through F22 with unit "m"
7. THE Template_Mapper SHALL write the weight field to cells D24 through F24 with unit "kg"
8. THE Template_Mapper SHALL write the blood_type field to cells D25 through F25
9. THE Template_Mapper SHALL write the gsis_id_no field to cells D27 through F27
10. THE Template_Mapper SHALL write the pag_ibig_id_no field to cells D29 through F29
11. THE Template_Mapper SHALL write the philhealth_no field to cells D31 through F31
12. THE Template_Mapper SHALL write the sss_no field to cells D32 through F32
13. THE Template_Mapper SHALL write the tin_no field to cells D33 through F33
14. THE Template_Mapper SHALL write the agency_employee_no field to cells D34 through F34
15. THE Template_Mapper SHALL write the telephone_no field to cells I32 through N32
16. THE Template_Mapper SHALL write the mobile_no field to cells I33 through N33
17. THE Template_Mapper SHALL write the email_address field to cells I34 through N34

### Requirement 3: Address Information Mapping

**User Story:** As a Faculty_User or Dean_User, I want my residential and permanent addresses correctly placed in the Excel template, so that my contact information is properly formatted.

#### Acceptance Criteria

1. THE Template_Mapper SHALL write the residential_house_no field to cells I17 through K17
2. THE Template_Mapper SHALL write the residential_street field to cells L17 through N17
3. THE Template_Mapper SHALL write the residential_subdivision field to cells I19 through K19
4. THE Template_Mapper SHALL write the residential_barangay field to cells L19 through N19
5. THE Template_Mapper SHALL write the residential_city field to cells I22 through K22
6. THE Template_Mapper SHALL write the residential_province field to cells L22 through N22
7. THE Template_Mapper SHALL write the residential_zip_code field to cells I24 through N24
8. THE Template_Mapper SHALL write the permanent_house_no field to cells I25 through K25
9. THE Template_Mapper SHALL write the permanent_street field to cells L25 through N25
10. THE Template_Mapper SHALL write the permanent_subdivision field to cells I27 through K27
11. THE Template_Mapper SHALL write the permanent_barangay field to cells L27 through N27
12. THE Template_Mapper SHALL write the permanent_city field to cell J29
13. THE Template_Mapper SHALL write the permanent_province field to cell M27
14. THE Template_Mapper SHALL write the permanent_zip_code field to cells I31 through K31

### Requirement 4: Family Background Mapping

**User Story:** As a Faculty_User or Dean_User, I want my family information correctly placed in the Excel template, so that my spouse, father, and mother details are properly documented.

#### Acceptance Criteria

1. THE Template_Mapper SHALL write the spouse_surname field to cells D36 through H36
2. THE Template_Mapper SHALL write the spouse_first_name field to cells D37 through F37
3. THE Template_Mapper SHALL write the spouse_middle_name field to cells D38 through H38
4. THE Template_Mapper SHALL write the spouse_occupation field to cells D39 through H39
5. THE Template_Mapper SHALL write the spouse_employer field to cells D40 through H40
6. THE Template_Mapper SHALL write the spouse_business_address field to cells D41 through H41
7. THE Template_Mapper SHALL write the spouse_telephone field to cells D42 through H42
8. THE Template_Mapper SHALL write the father_surname field to cells D43 through H43
9. THE Template_Mapper SHALL write the father_first_name field to cells D44 through F44
10. THE Template_Mapper SHALL write the father_middle_name field to cells D45 through H45
11. THE Template_Mapper SHALL write the mother_surname field to cells D47 through H47
12. THE Template_Mapper SHALL write the mother_first_name field to cells D48 through H48
13. THE Template_Mapper SHALL write the mother_middle_name field to cells D49 through H49

### Requirement 5: Children Information Mapping

**User Story:** As a Faculty_User or Dean_User, I want my children's information correctly placed in the Excel template, so that my family composition is complete.

#### Acceptance Criteria

1. WHEN the PDS_Record contains children records, THE Template_Mapper SHALL write each child's name and date_of_birth to sequential rows starting at row 36
2. THE Template_Mapper SHALL write each child_name to column J of the corresponding row
3. THE Template_Mapper SHALL write each child date_of_birth to column L of the corresponding row in MM/DD/YYYY format
4. THE Template_Mapper SHALL support up to 12 children entries in the template
5. IF the PDS_Record contains more than 12 children, THEN THE Template_Mapper SHALL write only the first 12 children

### Requirement 6: Educational Background Mapping

**User Story:** As a Faculty_User or Dean_User, I want my educational background correctly placed in the Excel template, so that my academic qualifications are properly documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains education records, THE Template_Mapper SHALL write each education entry to the appropriate level section (ELEMENTARY, SECONDARY, VOCATIONAL, COLLEGE, GRADUATE STUDIES)
2. THE Template_Mapper SHALL write the school_name field to the designated school name column
3. THE Template_Mapper SHALL write the degree_course field to the designated degree column
4. THE Template_Mapper SHALL write the period_from and period_to fields to the designated period columns
5. THE Template_Mapper SHALL write the highest_level_earned field to the designated units column
6. THE Template_Mapper SHALL write the year_graduated field to the designated year graduated column
7. THE Template_Mapper SHALL write the scholarship_honors field to the designated honors column
8. THE Template_Mapper SHALL place ELEMENTARY level entries starting at row 51
9. THE Template_Mapper SHALL place SECONDARY level entries starting at row 52
10. THE Template_Mapper SHALL place VOCATIONAL level entries starting at row 53
11. THE Template_Mapper SHALL place COLLEGE level entries starting at row 54
12. THE Template_Mapper SHALL place GRADUATE STUDIES level entries starting at row 56

### Requirement 7: Civil Service Eligibility Mapping

**User Story:** As a Faculty_User or Dean_User, I want my civil service eligibility information correctly placed in the Excel template, so that my professional qualifications are documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains eligibility records, THE Template_Mapper SHALL write each eligibility entry to sequential rows starting at row 61
2. THE Template_Mapper SHALL write the career_service field to column D
3. THE Template_Mapper SHALL write the rating field to column F
4. THE Template_Mapper SHALL write the date_of_examination field to column G in MM/DD/YYYY format
5. THE Template_Mapper SHALL write the place_of_examination field to column I
6. THE Template_Mapper SHALL write the license_number field to column K
7. THE Template_Mapper SHALL write the license_validity field to column M in MM/DD/YYYY format
8. THE Template_Mapper SHALL support up to 7 eligibility entries in the template

### Requirement 8: Work Experience Mapping

**User Story:** As a Faculty_User or Dean_User, I want my work experience correctly placed in the Excel template, so that my employment history is properly documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains work experience records, THE Template_Mapper SHALL write each work experience entry to sequential rows starting at row 69
2. THE Template_Mapper SHALL write the date_from field to column D in MM/DD/YYYY format
3. THE Template_Mapper SHALL write the date_to field to column E in MM/DD/YYYY format
4. THE Template_Mapper SHALL write the position_title field to column F
5. THE Template_Mapper SHALL write the department_agency field to column G
6. THE Template_Mapper SHALL write the monthly_salary field to column H formatted as currency
7. THE Template_Mapper SHALL write the salary_grade field to column J
8. THE Template_Mapper SHALL write the status_of_appointment field to column K
9. THE Template_Mapper SHALL write "Y" or "N" to column L based on is_government_service field
10. THE Template_Mapper SHALL support up to 28 work experience entries in the template

### Requirement 9: Learning and Development Mapping

**User Story:** As a Faculty_User or Dean_User, I want my training programs correctly placed in the Excel template, so that my professional development is documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains training records, THE Template_Mapper SHALL write each training entry to sequential rows starting at row 98
2. THE Template_Mapper SHALL write the title field to column D
3. THE Template_Mapper SHALL write the date_from field to column F in MM/DD/YYYY format
4. THE Template_Mapper SHALL write the date_to field to column G in MM/DD/YYYY format
5. THE Template_Mapper SHALL write the number_of_hours field to column H
6. THE Template_Mapper SHALL write the type_of_ld field to column I
7. THE Template_Mapper SHALL write the conducted_by field to column J
8. THE Template_Mapper SHALL support up to 21 training entries in the template

### Requirement 10: Voluntary Work Mapping

**User Story:** As a Faculty_User or Dean_User, I want my voluntary work correctly placed in the Excel template, so that my community involvement is documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains voluntary work records, THE Template_Mapper SHALL write each voluntary work entry to sequential rows starting at row 120
2. THE Template_Mapper SHALL write the organization_name and organization_address fields to column D
3. THE Template_Mapper SHALL write the date_from field to column F in MM/DD/YYYY format
4. THE Template_Mapper SHALL write the date_to field to column G in MM/DD/YYYY format
5. THE Template_Mapper SHALL write the number_of_hours field to column H
6. THE Template_Mapper SHALL write the position_nature_of_work field to column I
7. THE Template_Mapper SHALL support up to 7 voluntary work entries in the template

### Requirement 11: Other Information Mapping

**User Story:** As a Faculty_User or Dean_User, I want my skills, recognitions, and memberships correctly placed in the Excel template, so that my additional qualifications are documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains other_info records with info_type "SKILL", THE Template_Mapper SHALL write each skill entry to sequential rows starting at row 128 in column D
2. WHEN the PDS_Record contains other_info records with info_type "RECOGNITION", THE Template_Mapper SHALL write each recognition entry to sequential rows starting at row 128 in column F
3. WHEN the PDS_Record contains other_info records with info_type "MEMBERSHIP", THE Template_Mapper SHALL write each membership entry to sequential rows starting at row 128 in column H
4. THE Template_Mapper SHALL support up to 7 entries for each info_type category

### Requirement 12: References Mapping

**User Story:** As a Faculty_User or Dean_User, I want my character references correctly placed in the Excel template, so that my references are properly documented.

#### Acceptance Criteria

1. WHEN the PDS_Record contains reference records, THE Template_Mapper SHALL write each reference entry to sequential rows starting at row 136
2. THE Template_Mapper SHALL write the name field to column D
3. THE Template_Mapper SHALL write the address field to column F
4. THE Template_Mapper SHALL write the telephone_number field to column H
5. THE Template_Mapper SHALL support up to 3 reference entries in the template

### Requirement 13: Questionnaire Responses Mapping

**User Story:** As a Faculty_User or Dean_User, I want my questionnaire responses correctly placed in the Excel template, so that my declarations are properly documented.

#### Acceptance Criteria

1. THE Template_Mapper SHALL write q34_a_answer as "YES" or "NO" to the designated cell for question 34a
2. THE Template_Mapper SHALL write q34_a_details to the designated details cell when q34_a_answer is true
3. THE Template_Mapper SHALL write q34_b_answer as "YES" or "NO" to the designated cell for question 34b
4. THE Template_Mapper SHALL write q34_b_details to the designated details cell when q34_b_answer is true
5. THE Template_Mapper SHALL write q35_a_answer as "YES" or "NO" to the designated cell for question 35a
6. THE Template_Mapper SHALL write q35_a_details to the designated details cell when q35_a_answer is true
7. THE Template_Mapper SHALL write q35_b_answer as "YES" or "NO" to the designated cell for question 35b
8. THE Template_Mapper SHALL write q35_b_details to the designated details cell when q35_b_answer is true
9. THE Template_Mapper SHALL write q36_answer as "YES" or "NO" to the designated cell for question 36
10. THE Template_Mapper SHALL write q36_details, q36_date_filed, and q36_case_status to the designated cells when q36_answer is true
11. THE Template_Mapper SHALL write q37_answer as "YES" or "NO" to the designated cell for question 37
12. THE Template_Mapper SHALL write q37_details to the designated details cell when q37_answer is true
13. THE Template_Mapper SHALL write q38_answer as "YES" or "NO" to the designated cell for question 38
14. THE Template_Mapper SHALL write q38_details to the designated details cell when q38_answer is true
15. THE Template_Mapper SHALL write q39_answer as "YES" or "NO" to the designated cell for question 39
16. THE Template_Mapper SHALL write q39_details to the designated details cell when q39_answer is true
17. THE Template_Mapper SHALL write q40_answer as "YES" or "NO" to the designated cell for question 40
18. THE Template_Mapper SHALL write q40_details to the designated details cell when q40_answer is true
19. THE Template_Mapper SHALL write q41_answer as "YES" or "NO" to the designated cell for question 41
20. THE Template_Mapper SHALL write q41_country to the designated details cell when q41_answer is true
21. THE Template_Mapper SHALL write q42_answer as "YES" or "NO" to the designated cell for question 42
22. THE Template_Mapper SHALL write q42_group to the designated details cell when q42_answer is true
23. THE Template_Mapper SHALL write q43_answer as "YES" or "NO" to the designated cell for question 43
24. THE Template_Mapper SHALL write q43_id_no to the designated details cell when q43_answer is true
25. THE Template_Mapper SHALL write q44_answer as "YES" or "NO" to the designated cell for question 44
26. THE Template_Mapper SHALL write q44_id_no to the designated details cell when q44_answer is true

### Requirement 14: API Endpoint

**User Story:** As a Faculty_User or Dean_User, I want a secure API endpoint to request my PDS Excel export, so that only I can download my own PDS data.

#### Acceptance Criteria

1. THE System SHALL provide a GET endpoint at "/api/pds/export/excel" for Faculty_User
2. THE System SHALL provide a GET endpoint at "/api/dean-pds/export/excel" for Dean_User
3. WHEN a request is received, THE System SHALL verify the user's authentication token
4. WHEN a request is received, THE System SHALL verify the user has permission to access their own PDS_Record
5. IF authentication fails, THEN THE System SHALL return HTTP status 401 with error message "Unauthorized"
6. IF the user has no PDS_Record, THEN THE System SHALL return HTTP status 404 with error message "PDS not found"
7. WHEN the Excel file is generated successfully, THE System SHALL return HTTP status 200 with Content-Type "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
8. WHEN the Excel file is generated successfully, THE System SHALL set Content-Disposition header to "attachment; filename=PDS_{Surname}_{FirstName}_{YYYYMMDD}.xlsx"
9. IF an error occurs during generation, THEN THE System SHALL return HTTP status 500 with error message "Failed to generate Excel file"

### Requirement 15: Frontend Integration

**User Story:** As a Faculty_User or Dean_User, I want an export button in my PDS interface, so that I can easily download my PDS as an Excel file.

#### Acceptance Criteria

1. THE System SHALL display an Export_Button labeled "Export to Excel" in the PDS view page
2. THE Export_Button SHALL display an Excel icon or appropriate visual indicator
3. WHEN the Export_Button is clicked, THE System SHALL call the appropriate API endpoint
4. WHILE the Excel file is being generated, THE System SHALL display a loading indicator on the Export_Button
5. WHEN the API returns successfully, THE System SHALL trigger the browser download
6. IF the API returns an error, THEN THE System SHALL display an error notification with the error message
7. THE Export_Button SHALL be enabled only when the user has a PDS_Record

### Requirement 16: Template Base File

**User Story:** As a system administrator, I want a base Excel template file stored in the system, so that the exported PDS files maintain consistent formatting and structure.

#### Acceptance Criteria

1. THE System SHALL store a base Excel template file at "backend/public/templates/pds-template.xlsx"
2. THE Excel_Exporter SHALL load the base template file before populating data
3. THE base template file SHALL contain all official PDS form sections, headers, and formatting
4. THE base template file SHALL contain merged cells matching the official PDS layout
5. THE base template file SHALL contain appropriate column widths and row heights
6. WHEN the base template file is missing, THEN THE System SHALL return HTTP status 500 with error message "PDS template file not found"

### Requirement 17: Data Formatting and Validation

**User Story:** As a Faculty_User or Dean_User, I want my data properly formatted in the Excel file, so that the exported file is readable and professional.

#### Acceptance Criteria

1. THE Template_Mapper SHALL format all date fields as MM/DD/YYYY
2. THE Template_Mapper SHALL format all currency fields with two decimal places
3. THE Template_Mapper SHALL format all decimal fields (height, weight) with two decimal places
4. THE Template_Mapper SHALL convert boolean values to "YES" or "NO" text
5. THE Template_Mapper SHALL handle null or undefined values by leaving cells empty
6. THE Template_Mapper SHALL trim whitespace from all text fields
7. THE Template_Mapper SHALL preserve cell formatting from the base template file
8. THE Template_Mapper SHALL preserve merged cells from the base template file

### Requirement 18: Error Handling and Logging

**User Story:** As a system administrator, I want comprehensive error handling and logging for the Excel export feature, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN an error occurs during Excel generation, THE System SHALL log the error with timestamp, user_id, and error details
2. WHEN database queries fail, THE System SHALL log the query error and return a user-friendly error message
3. WHEN the xlsx library throws an error, THE System SHALL catch the error and return HTTP status 500
4. WHEN file system operations fail, THE System SHALL log the file system error and return a user-friendly error message
5. THE System SHALL log successful Excel exports with timestamp and user_id for audit purposes

### Requirement 19: Performance and Resource Management

**User Story:** As a system administrator, I want the Excel export feature to be performant and resource-efficient, so that it does not impact system performance.

#### Acceptance Criteria

1. THE Excel_Exporter SHALL generate the Excel file in memory without creating temporary files on disk
2. THE Excel_Exporter SHALL release memory resources after sending the file to the client
3. THE System SHALL support concurrent Excel export requests from multiple users
4. THE Excel_Exporter SHALL complete file generation within 5 seconds for a complete PDS_Record
5. THE System SHALL limit the response size to 10MB per Excel file

### Requirement 20: Cross-User Type Support

**User Story:** As a system administrator, I want the Excel export feature to work for both Faculty and Dean users, so that all user types can export their PDS data.

#### Acceptance Criteria

1. THE System SHALL use the same Excel_Exporter logic for both Faculty_User and Dean_User
2. THE System SHALL retrieve PDS_Record using faculty_id for Faculty_User requests
3. THE System SHALL retrieve PDS_Record using dean_id for Dean_User requests
4. THE Template_Mapper SHALL apply the same cell mapping rules regardless of user type
5. THE generated Excel file SHALL have the same structure and format for both user types
