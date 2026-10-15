const { dbConfig } = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,

  dialectOptions: dbConfig.dialectOptions,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

const Dean = require("./dean.model")(sequelize, Sequelize);
const Faculty = require("./faculty.model")(sequelize, Sequelize);
const Organization = require("./organization.model")(sequelize, Sequelize);
const User = require("./user.model")(sequelize, Sequelize);
const Admin = require("./admin.model")(sequelize, Sequelize);
const AcademicYear = require("./academic-year.model")(sequelize, Sequelize);
const Campus = require("./campus.model")(sequelize, Sequelize);
const Department = require("./department.model")(sequelize, Sequelize);
const CollegeDepartment = require("./college-department.model")(
  sequelize,
  Sequelize,
);
const RequirementSubmission = require("./requirement-submission.model")(
  sequelize,
  Sequelize,
);
const RequirementFile = require("./requirement-file.model")(
  sequelize,
  Sequelize,
);
const FacultyCredential = require("./faculty-credential.model")(
  sequelize,
  Sequelize,
);
const CredentialCertificate = require("./credential-certificate.model")(
  sequelize,
  Sequelize,
);
const PersonalDataSheet = require("./personal-data-sheet.model")(
  sequelize,
  Sequelize,
);
const PDSChild = require("./pds-child.model")(sequelize, Sequelize);
const PDSEducation = require("./pds-education.model")(sequelize, Sequelize);
const PDSEligibility = require("./pds-eligibility.model")(sequelize, Sequelize);
const PDSWorkExperience = require("./pds-work-experience.model")(
  sequelize,
  Sequelize,
);
const PDSVoluntaryWork = require("./pds-voluntary-work.model")(
  sequelize,
  Sequelize,
);
const PDSTraining = require("./pds-training.model")(sequelize, Sequelize);
const PDSOtherInfo = require("./pds-other-info.model")(sequelize, Sequelize);
const PDSReference = require("./pds-reference.model")(sequelize, Sequelize);
const FacultyClearance = require("./faculty-clearance.model")(
  sequelize,
  Sequelize,
);
const Announcement = require("./announcement.model")(sequelize, Sequelize);
const AnnouncementRead = require("./announcement-read.model")(
  sequelize,
  Sequelize,
);
const OrganizationAdviser = require("./organization-adviser.model")(
  sequelize,
  Sequelize,
);
const OrganizationMember = require("./organization-member.model")(
  sequelize,
  Sequelize,
);
const DocumentType = require("./document-type.model")(sequelize, Sequelize);
const OrganizationDocument = require("./organization-document.model")(
  sequelize,
  Sequelize,
);
const OrganizationPositionTemplate =
  require("./organization-position-template.model")(sequelize, Sequelize);
const OrganizationBulkUpload = require("./organization-bulk-upload.model")(
  sequelize,
  Sequelize,
);

// Organization Event Models
const OrganizationEvent = require("./organization-event.model")(
  sequelize,
  Sequelize,
);
const OrganizationEventSDG = require("./organization-event-sdg.model")(
  sequelize,
  Sequelize,
);
const OrganizationEventGuest = require("./organization-event-guest.model")(
  sequelize,
  Sequelize,
);
const OrganizationEventAttendee =
  require("./organization-event-attendee.model")(sequelize, Sequelize);

// New Faculty Profile Models
const FacultyPersonalProfile = require("./faculty-personal-profile.model")(
  sequelize,
  Sequelize,
);
const FacultyAcademicProfile = require("./faculty-academic-profile.model")(
  sequelize,
  Sequelize,
);
const FacultyEmploymentProfile = require("./faculty-employment-profile.model")(
  sequelize,
  Sequelize,
);
const FacultyProfessionalMembership =
  require("./faculty-professional-membership.model")(sequelize, Sequelize);
const FacultyAwards = require("./faculty-awards.model")(sequelize, Sequelize);
const FacultySeminarsTrainings = require("./faculty-seminars-trainings.model")(
  sequelize,
  Sequelize,
);
const FacultyResearchActivities =
  require("./faculty-research-activities.model")(sequelize, Sequelize);
const FacultyExtensionActivities =
  require("./faculty-extension-activities.model")(sequelize, Sequelize);

// Dean Profile Models
const DeanPersonalProfile = require("./dean-personal-profile.model")(
  sequelize,
  Sequelize,
);
const DeanAcademicProfile = require("./dean-academic-profile.model")(
  sequelize,
  Sequelize,
);
const DeanEmploymentProfile = require("./dean-employment-profile.model")(
  sequelize,
  Sequelize,
);
const DeanProfessionalMembership =
  require("./dean-professional-membership.model")(sequelize, Sequelize);
const DeanAwards = require("./dean-awards.model")(sequelize, Sequelize);
const DeanSeminarsTrainings = require("./dean-seminars-trainings.model")(
  sequelize,
  Sequelize,
);
const DeanResearchActivities = require("./dean-research-activities.model")(
  sequelize,
  Sequelize,
);
const DeanExtensionActivities = require("./dean-extension-activities.model")(
  sequelize,
  Sequelize,
);

// CVL Attachments Model
const CVLAttachment = require("./cvl-attachment.model")(sequelize, Sequelize);

/* User → Admin (1:1) */
User.hasOne(Admin, {
  foreignKey: "user_id",
});
Admin.belongsTo(User, {
  foreignKey: "user_id",
});

/* User → Dean (1:1) */
User.hasOne(Dean, {
  foreignKey: "user_id",
});
Dean.belongsTo(User, {
  foreignKey: "user_id",
});

/* User → Faculty (1:1) */
User.hasOne(Faculty, {
  foreignKey: "user_id",
});
Faculty.belongsTo(User, {
  foreignKey: "user_id",
});

/* User → Organization (1:1) */
User.hasOne(Organization, {
  foreignKey: "user_id",
});
Organization.belongsTo(User, {
  foreignKey: "user_id",
});

/* Faculty → Organizations (1:1 - one faculty assigned to organization) */
Faculty.hasOne(Organization, {
  foreignKey: "faculty_id",
});
Organization.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

/* RequirementSubmission Relationships */
Faculty.hasMany(RequirementSubmission, {
  foreignKey: "faculty_id",
});
RequirementSubmission.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

AcademicYear.hasMany(RequirementSubmission, {
  foreignKey: "academic_year_id",
});
RequirementSubmission.belongsTo(AcademicYear, {
  foreignKey: "academic_year_id",
});

/* RequirementFile Relationships */
RequirementSubmission.hasMany(RequirementFile, {
  foreignKey: "submission_id",
  as: "files",
});
RequirementFile.belongsTo(RequirementSubmission, {
  foreignKey: "submission_id",
});

/* FacultyCredential Relationships */
Faculty.hasOne(FacultyCredential, {
  foreignKey: "faculty_id",
  as: "faculty_credential",
});
FacultyCredential.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

/* CredentialCertificate Relationships */
FacultyCredential.hasMany(CredentialCertificate, {
  foreignKey: "credential_id",
  as: "credential_certificates",
});
CredentialCertificate.belongsTo(FacultyCredential, {
  foreignKey: "credential_id",
});

/* PersonalDataSheet Relationships */
Faculty.hasOne(PersonalDataSheet, {
  foreignKey: "faculty_id",
  as: "PersonalDataSheet", // Add explicit alias
});
PersonalDataSheet.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Dean.hasOne(PersonalDataSheet, {
  foreignKey: "dean_id",
  as: "PersonalDataSheet", // Add explicit alias
});
PersonalDataSheet.belongsTo(Dean, {
  foreignKey: "dean_id",
});

/* PDS Children Relationships */
PersonalDataSheet.hasMany(PDSChild, {
  foreignKey: "pds_id",
  as: "children",
});
PDSChild.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Education Relationships */
PersonalDataSheet.hasMany(PDSEducation, {
  foreignKey: "pds_id",
  as: "education",
});
PDSEducation.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Eligibility Relationships */
PersonalDataSheet.hasMany(PDSEligibility, {
  foreignKey: "pds_id",
  as: "eligibilities",
});
PDSEligibility.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Work Experience Relationships */
PersonalDataSheet.hasMany(PDSWorkExperience, {
  foreignKey: "pds_id",
  as: "work_experiences",
});
PDSWorkExperience.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Voluntary Work Relationships */
PersonalDataSheet.hasMany(PDSVoluntaryWork, {
  foreignKey: "pds_id",
  as: "voluntary_works",
});
PDSVoluntaryWork.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Training Relationships */
PersonalDataSheet.hasMany(PDSTraining, {
  foreignKey: "pds_id",
  as: "trainings",
});
PDSTraining.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS Other Info Relationships */
PersonalDataSheet.hasMany(PDSOtherInfo, {
  foreignKey: "pds_id",
  as: "other_info",
});
PDSOtherInfo.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* PDS References Relationships */
PersonalDataSheet.hasMany(PDSReference, {
  foreignKey: "pds_id",
  as: "references",
});
PDSReference.belongsTo(PersonalDataSheet, {
  foreignKey: "pds_id",
});

/* FacultyClearance Relationships */
Faculty.hasMany(FacultyClearance, {
  foreignKey: "faculty_id",
  as: "clearances",
});
FacultyClearance.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

AcademicYear.hasMany(FacultyClearance, {
  foreignKey: "academic_year_id",
});
FacultyClearance.belongsTo(AcademicYear, {
  foreignKey: "academic_year_id",
});

/* Announcement Relationships */
Dean.hasMany(Announcement, {
  foreignKey: "dean_id",
  as: "announcements",
});
Announcement.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Announcement.hasMany(AnnouncementRead, {
  foreignKey: "announcement_id",
  as: "reads",
});
AnnouncementRead.belongsTo(Announcement, {
  foreignKey: "announcement_id",
});

Faculty.hasMany(AnnouncementRead, {
  foreignKey: "faculty_id",
  as: "announcement_reads",
});
AnnouncementRead.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

/* Organization Adviser Relationships */
Organization.hasMany(OrganizationAdviser, {
  foreignKey: "organization_id",
});
OrganizationAdviser.belongsTo(Organization, {
  foreignKey: "organization_id",
});

Faculty.hasMany(OrganizationAdviser, {
  foreignKey: "faculty_id",
  as: "adviser_assignments",
});
OrganizationAdviser.belongsTo(Faculty, {
  foreignKey: "faculty_id",
  as: "Faculty",
});

/* Organization Member Relationships */
Organization.hasMany(OrganizationMember, {
  foreignKey: "organization_id",
  as: "members",
});
OrganizationMember.belongsTo(Organization, {
  foreignKey: "organization_id",
});

AcademicYear.hasMany(OrganizationMember, {
  foreignKey: "academic_year_id",
});
OrganizationMember.belongsTo(AcademicYear, {
  foreignKey: "academic_year_id",
});

/* Self-referential relationship for member hierarchy */
OrganizationMember.hasMany(OrganizationMember, {
  foreignKey: "parent_member_id",
  as: "subordinates",
});
OrganizationMember.belongsTo(OrganizationMember, {
  foreignKey: "parent_member_id",
  as: "supervisor",
});

/* Organization Bulk Upload Relationships */
Organization.hasMany(OrganizationBulkUpload, {
  foreignKey: "organization_id",
  as: "bulk_uploads",
});
OrganizationBulkUpload.belongsTo(Organization, {
  foreignKey: "organization_id",
});

AcademicYear.hasMany(OrganizationBulkUpload, {
  foreignKey: "academic_year_id",
});
OrganizationBulkUpload.belongsTo(AcademicYear, {
  foreignKey: "academic_year_id",
});

User.hasMany(OrganizationBulkUpload, {
  foreignKey: "uploaded_by",
  as: "bulk_uploads",
});
OrganizationBulkUpload.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploader",
});

/* Organization Document Relationships */
Organization.hasMany(OrganizationDocument, {
  foreignKey: "organization_id",
  as: "documents",
});
OrganizationDocument.belongsTo(Organization, {
  foreignKey: "organization_id",
});

DocumentType.hasMany(OrganizationDocument, {
  foreignKey: "document_type_id",
});
OrganizationDocument.belongsTo(DocumentType, {
  foreignKey: "document_type_id",
});

AcademicYear.hasMany(OrganizationDocument, {
  foreignKey: "academic_year_id",
});
OrganizationDocument.belongsTo(AcademicYear, {
  foreignKey: "academic_year_id",
});

User.hasMany(OrganizationDocument, {
  foreignKey: "reviewed_by",
  as: "reviewed_documents",
});
OrganizationDocument.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewer",
});

/* Faculty Profile Relationships */
Faculty.hasOne(FacultyPersonalProfile, {
  foreignKey: "faculty_id",
  as: "personal_profile",
});
FacultyPersonalProfile.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyAcademicProfile, {
  foreignKey: "faculty_id",
  as: "academic_profiles",
});
FacultyAcademicProfile.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyEmploymentProfile, {
  foreignKey: "faculty_id",
  as: "employment_profiles",
});
FacultyEmploymentProfile.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyProfessionalMembership, {
  foreignKey: "faculty_id",
  as: "professional_memberships",
});
FacultyProfessionalMembership.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyAwards, {
  foreignKey: "faculty_id",
  as: "awards",
});
FacultyAwards.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultySeminarsTrainings, {
  foreignKey: "faculty_id",
  as: "seminars_trainings",
});
FacultySeminarsTrainings.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyResearchActivities, {
  foreignKey: "faculty_id",
  as: "research_activities",
});
FacultyResearchActivities.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

Faculty.hasMany(FacultyExtensionActivities, {
  foreignKey: "faculty_id",
  as: "extension_activities",
});
FacultyExtensionActivities.belongsTo(Faculty, {
  foreignKey: "faculty_id",
});

/* Dean Profile Relationships */
Dean.hasOne(DeanPersonalProfile, {
  foreignKey: "dean_id",
  as: "personal_profile",
});
DeanPersonalProfile.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanAcademicProfile, {
  foreignKey: "dean_id",
  as: "academic_profiles",
});
DeanAcademicProfile.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanEmploymentProfile, {
  foreignKey: "dean_id",
  as: "employment_profiles",
});
DeanEmploymentProfile.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanProfessionalMembership, {
  foreignKey: "dean_id",
  as: "professional_memberships",
});
DeanProfessionalMembership.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanAwards, {
  foreignKey: "dean_id",
  as: "awards",
});
DeanAwards.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanSeminarsTrainings, {
  foreignKey: "dean_id",
  as: "seminars_trainings",
});
DeanSeminarsTrainings.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanResearchActivities, {
  foreignKey: "dean_id",
  as: "research_activities",
});
DeanResearchActivities.belongsTo(Dean, {
  foreignKey: "dean_id",
});

Dean.hasMany(DeanExtensionActivities, {
  foreignKey: "dean_id",
  as: "extension_activities",
});
DeanExtensionActivities.belongsTo(Dean, {
  foreignKey: "dean_id",
});

/* CVL Attachment Relationships */
Organization.hasMany(CVLAttachment, {
  foreignKey: "organization_id",
  as: "cvl_attachments",
});
CVLAttachment.belongsTo(Organization, {
  foreignKey: "organization_id",
});

db.Dean = Dean;
db.Faculty = Faculty;
db.Organization = Organization;
db.User = User;
db.Admin = Admin;
db.AcademicYear = AcademicYear;
db.Campus = Campus;
db.Department = Department;
db.CollegeDepartment = CollegeDepartment;

/* Campus → Department (1:many) */
Campus.hasMany(Department, { foreignKey: "campus_id", as: "departments" });
Department.belongsTo(Campus, { foreignKey: "campus_id", as: "campus" });

/* CollegeDepartment associations */
CollegeDepartment.belongsTo(Campus, { foreignKey: "campus_id", as: "campus" });
CollegeDepartment.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});
CollegeDepartment.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasOne(CollegeDepartment, {
  foreignKey: "user_id",
  as: "college_department",
});
db.FacultyClearance = FacultyClearance;
db.RequirementSubmission = RequirementSubmission;
db.RequirementFile = RequirementFile;
db.FacultyCredential = FacultyCredential;
db.CredentialCertificate = CredentialCertificate;
db.PersonalDataSheet = PersonalDataSheet;
db.PDSChild = PDSChild;
db.PDSEducation = PDSEducation;
db.PDSEligibility = PDSEligibility;
db.PDSWorkExperience = PDSWorkExperience;
db.PDSVoluntaryWork = PDSVoluntaryWork;
db.PDSTraining = PDSTraining;
db.PDSOtherInfo = PDSOtherInfo;
db.PDSReference = PDSReference;
db.Announcement = Announcement;
db.AnnouncementRead = AnnouncementRead;
db.OrganizationAdviser = OrganizationAdviser;
db.OrganizationMember = OrganizationMember;
db.DocumentType = DocumentType;
db.OrganizationDocument = OrganizationDocument;
db.OrganizationPositionTemplate = OrganizationPositionTemplate;
db.OrganizationBulkUpload = OrganizationBulkUpload;
db.OrganizationEvent = OrganizationEvent;
db.OrganizationEventSDG = OrganizationEventSDG;
db.OrganizationEventGuest = OrganizationEventGuest;
db.OrganizationEventAttendee = OrganizationEventAttendee;

// New Faculty Profile Models
db.FacultyPersonalProfile = FacultyPersonalProfile;
db.FacultyAcademicProfile = FacultyAcademicProfile;
db.FacultyEmploymentProfile = FacultyEmploymentProfile;
db.FacultyProfessionalMembership = FacultyProfessionalMembership;
db.FacultyAwards = FacultyAwards;
db.FacultySeminarsTrainings = FacultySeminarsTrainings;
db.FacultyResearchActivities = FacultyResearchActivities;
db.FacultyExtensionActivities = FacultyExtensionActivities;

// Dean Profile Models
db.DeanPersonalProfile = DeanPersonalProfile;
db.DeanAcademicProfile = DeanAcademicProfile;
db.DeanEmploymentProfile = DeanEmploymentProfile;
db.DeanProfessionalMembership = DeanProfessionalMembership;
db.DeanAwards = DeanAwards;
db.DeanSeminarsTrainings = DeanSeminarsTrainings;
db.DeanResearchActivities = DeanResearchActivities;
db.DeanExtensionActivities = DeanExtensionActivities;

// CVL Attachments
db.CVLAttachment = CVLAttachment;

module.exports = db;
