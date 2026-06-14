module.exports = (sequelize, Sequelize) => {
  const PersonalDataSheet = sequelize.define("personal_data_sheets", {
    pds_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    faculty_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    dean_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    // I. PERSONAL INFORMATION
    surname: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    middle_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    name_extension: {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: "e.g., Jr, Sr, III",
    },
    date_of_birth: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    place_of_birth: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    sex: {
      type: Sequelize.ENUM("Male", "Female"),
      allowNull: false,
    },
    civil_status: {
      type: Sequelize.ENUM(
        "Single",
        "Married",
        "Widowed",
        "Separated",
        "Others",
      ),
      allowNull: false,
    },
    height: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: "Height in meters (e.g., 1.70)",
    },
    weight: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: "Weight in kg",
    },
    blood_type: {
      type: Sequelize.STRING(5),
      allowNull: true,
    },
    gsis_id_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    pag_ibig_id_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    philhealth_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    sss_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tin_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    agency_employee_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Citizenship
    citizenship_type: {
      type: Sequelize.ENUM("Filipino", "Dual Citizenship", "By Naturalization"),
      allowNull: false,
    },
    dual_citizenship_country: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Residential Address
    residential_house_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    residential_street: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    residential_subdivision: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    residential_barangay: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    residential_city: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    residential_province: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    residential_zip_code: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },

    // Permanent Address
    permanent_house_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    permanent_street: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    permanent_subdivision: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    permanent_barangay: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    permanent_city: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    permanent_province: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    permanent_zip_code: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },

    // Contact Information
    telephone_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mobile_no: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email_address: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    // II. FAMILY BACKGROUND
    // Spouse
    spouse_surname: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_first_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_middle_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_name_ext: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },
    spouse_occupation: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_employer: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_business_address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    spouse_telephone: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Father
    father_surname: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    father_first_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    father_middle_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    father_name_ext: {
      type: Sequelize.STRING(10),
      allowNull: true,
    },

    // Mother
    mother_surname: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mother_first_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mother_middle_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Questionnaire Answers (Section 34-40)
    // Q34 - Related by consanguinity/affinity
    q34_a_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q34_a_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    q34_b_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q34_b_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q35 - Administrative offense
    q35_a_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q35_a_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    q35_b_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q35_b_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q36 - Criminal charge
    q36_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q36_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    q36_date_filed: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    q36_case_status: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Q37 - Convicted of crime
    q37_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q37_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q38 - Separated from service
    q38_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q38_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q39 - Candidate in election
    q39_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q39_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q40 - Resigned/Campaigned
    q40_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q40_details: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    // Q41 - Immigrant/Permanent resident
    q41_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q41_country: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Q42 - Indigenous group
    q42_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q42_group: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Q43 - Person with disability
    q43_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q43_id_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Q44 - Solo parent
    q44_answer: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    q44_id_no: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // Files
    photo_path: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Path to uploaded photo (passport-sized)",
    },
    signature_path: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Path to uploaded signature (for digital certificate)",
    },

    // Government IDs
    government_issued_id: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "e.g., Passport, Driver's License",
    },
    government_id_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    government_id_date_issued: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    // Status
    status: {
      type: Sequelize.ENUM("draft", "submitted", "approved", "returned"),
      defaultValue: "draft",
    },
    submitted_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    approved_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Dean or Admin user_id who approved",
    },
    approved_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  });

  return PersonalDataSheet;
};
