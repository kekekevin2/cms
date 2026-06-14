const db = require("../models");

// Helper: resolve department for Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  const dean = await db.Dean.findOne({ where: { user_id: userId } });
  if (dean) return { department: dean.department, dean };
  const cd = await db.CollegeDepartment.findOne({
    where: { user_id: userId },
    include: [{ model: db.Department, as: 'department', attributes: ['department_name'] }],
  });
  if (cd && cd.department) return { department: cd.department.department_name, dean: null };
  return null;
}


// Get faculty demographics analytics
exports.getFacultyDemographics = async (req, res) => {
  try {
    const deanUserId = req.user.user_id; // Fixed: use user_id instead of userId

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all active (non-archived) faculty in the department with their PDS data
    const faculties = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.PersonalDataSheet,
          required: false, // LEFT JOIN to include faculty without PDS
          attributes: [
            "sex",
            "date_of_birth",
            "civil_status",
            "citizenship_type",
          ],
          include: [
            {
              model: db.PDSEducation,
              as: "education",
              required: false,
              attributes: ["level", "degree_course"],
            },
            {
              model: db.PDSEligibility,
              as: "eligibilities",
              required: false,
              attributes: [
                "career_service",
                "license_number",
                "rating",
                "date_of_examination",
              ],
            },
            {
              model: db.PDSTraining,
              as: "trainings",
              required: false,
              attributes: ["title", "number_of_hours", "type_of_ld"],
            },
          ],
        },
        {
          model: db.FacultyCredential,
          as: "faculty_credential",
          required: false, // LEFT JOIN to include faculty without credentials
          attributes: [
            "education",
            "professional_license",
            "specialization",
            "appointment_nature",
            "status",
          ],
        },
      ],
    });

    // If no faculty found, return empty stats
    if (faculties.length === 0) {
      return res.json({
        total_faculty: 0,
        gender: { male: 0, female: 0, not_specified: 0 },
        age_ranges: {
          "20-29": 0,
          "30-39": 0,
          "40-49": 0,
          "50-59": 0,
          "60+": 0,
          not_specified: 0,
        },
        civil_status: {
          single: 0,
          married: 0,
          widowed: 0,
          separated: 0,
          others: 0,
          not_specified: 0,
        },
        citizenship: {
          filipino: 0,
          dual_citizenship: 0,
          by_naturalization: 0,
          not_specified: 0,
        },
        education: {
          bachelors: 0,
          masters: 0,
          doctorate: 0,
          not_specified: 0,
        },
        credential_status: {
          validated: 0,
          pending: 0,
          returned: 0,
          not_submitted: 0,
        },
        certifications: {
          with_professional_license: 0,
          with_civil_service: 0,
          with_board_exam: 0,
          total_certifications: 0,
        },
        professional_licenses: {},
        appointment_nature: {
          permanent: 0,
          temporary: 0,
          contractual: 0,
          part_time: 0,
          others: 0,
        },
        training: {
          total_trainings: 0,
          total_hours: 0,
          faculty_with_trainings: 0,
          by_type: {
            managerial: 0,
            supervisory: 0,
            technical: 0,
            others: 0,
          },
        },
      });
    }

    // Calculate age from date_of_birth
    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return null;
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age;
    };

    // Gender distribution
    const genderStats = {
      male: 0,
      female: 0,
      not_specified: 0,
    };

    // Age range distribution
    const ageRanges = {
      "20-29": 0,
      "30-39": 0,
      "40-49": 0,
      "50-59": 0,
      "60+": 0,
      not_specified: 0,
    };

    // Civil status distribution
    const civilStatusStats = {
      single: 0,
      married: 0,
      widowed: 0,
      separated: 0,
      others: 0,
      not_specified: 0,
    };

    // Citizenship distribution
    const citizenshipStats = {
      filipino: 0,
      dual_citizenship: 0,
      by_naturalization: 0,
      not_specified: 0,
    };

    // Educational attainment (from credentials)
    const educationStats = {
      bachelors: 0,
      masters: 0,
      doctorate: 0,
      not_specified: 0,
    };

    // Credential status
    const credentialStatusStats = {
      validated: 0,
      pending: 0,
      returned: 0,
      not_submitted: 0,
    };

    // Certifications/Eligibility stats
    const certificationStats = {
      with_professional_license: 0,
      with_civil_service: 0,
      with_board_exam: 0,
      total_certifications: 0,
    };

    // Professional License Types (from faculty credentials)
    const professionalLicenseTypes = {};

    // Appointment Nature stats
    const appointmentNatureStats = {
      permanent: 0,
      temporary: 0,
      contractual: 0,
      part_time: 0,
      others: 0,
    };

    // Training/Professional Development stats
    const trainingStats = {
      total_trainings: 0,
      total_hours: 0,
      faculty_with_trainings: 0,
      by_type: {
        managerial: 0,
        supervisory: 0,
        technical: 0,
        others: 0,
      },
    };

    // Process each faculty
    faculties.forEach((faculty) => {
      const pds = faculty.PersonalDataSheet; // Fixed: use PascalCase

      // Gender
      if (pds && pds.sex) {
        if (pds.sex.toLowerCase() === "male") {
          genderStats.male++;
        } else if (pds.sex.toLowerCase() === "female") {
          genderStats.female++;
        }
      } else {
        genderStats.not_specified++;
      }

      // Age
      if (pds && pds.date_of_birth) {
        const age = calculateAge(pds.date_of_birth);
        if (age !== null) {
          if (age >= 20 && age <= 29) ageRanges["20-29"]++;
          else if (age >= 30 && age <= 39) ageRanges["30-39"]++;
          else if (age >= 40 && age <= 49) ageRanges["40-49"]++;
          else if (age >= 50 && age <= 59) ageRanges["50-59"]++;
          else if (age >= 60) ageRanges["60+"]++;
        } else {
          ageRanges.not_specified++;
        }
      } else {
        ageRanges.not_specified++;
      }

      // Civil Status
      if (pds && pds.civil_status) {
        const status = pds.civil_status.toLowerCase();
        if (status === "single") civilStatusStats.single++;
        else if (status === "married") civilStatusStats.married++;
        else if (status === "widowed") civilStatusStats.widowed++;
        else if (status === "separated") civilStatusStats.separated++;
        else civilStatusStats.others++;
      } else {
        civilStatusStats.not_specified++;
      }

      // Citizenship
      if (pds && pds.citizenship_type) {
        const citizenship = pds.citizenship_type.toLowerCase();
        if (citizenship === "filipino") citizenshipStats.filipino++;
        else if (citizenship === "dual citizenship")
          citizenshipStats.dual_citizenship++;
        else if (citizenship === "by naturalization")
          citizenshipStats.by_naturalization++;
      } else {
        citizenshipStats.not_specified++;
      }

      // Educational attainment (from PDS education records)
      if (
        faculty.PersonalDataSheet &&
        faculty.PersonalDataSheet.education &&
        faculty.PersonalDataSheet.education.length > 0
      ) {
        // Get the highest education level
        const educationLevels = faculty.PersonalDataSheet.education;
        let hasDoctorateDegree = false;
        let hasMastersDegree = false;
        let hasBachelorsDegree = false;

        educationLevels.forEach((edu) => {
          const degreeCourse = edu.degree_course
            ? edu.degree_course.toLowerCase()
            : "";
          const level = edu.level ? edu.level.toUpperCase() : "";

          if (
            level === "GRADUATE STUDIES" &&
            (degreeCourse.includes("doctor") ||
              degreeCourse.includes("phd") ||
              degreeCourse.includes("ph.d"))
          ) {
            hasDoctorateDegree = true;
          } else if (
            level === "GRADUATE STUDIES" &&
            (degreeCourse.includes("master") ||
              degreeCourse.includes("ma ") ||
              degreeCourse.includes("ms ") ||
              degreeCourse.includes("mba"))
          ) {
            hasMastersDegree = true;
          } else if (level === "COLLEGE") {
            hasBachelorsDegree = true;
          }
        });

        // Count highest degree
        if (hasDoctorateDegree) {
          educationStats.doctorate++;
        } else if (hasMastersDegree) {
          educationStats.masters++;
        } else if (hasBachelorsDegree) {
          educationStats.bachelors++;
        } else {
          educationStats.not_specified++;
        }
      } else {
        educationStats.not_specified++;
      }

      // Credential status
      if (faculty.faculty_credential) {
        const cred = faculty.faculty_credential;
        if (cred.status === "validated") credentialStatusStats.validated++;
        else if (cred.status === "pending") credentialStatusStats.pending++;
        else if (cred.status === "returned") credentialStatusStats.returned++;
        else credentialStatusStats.not_submitted++;
      } else {
        credentialStatusStats.not_submitted++;
      }

      // Certifications/Eligibility
      if (
        faculty.PersonalDataSheet &&
        faculty.PersonalDataSheet.eligibilities &&
        faculty.PersonalDataSheet.eligibilities.length > 0
      ) {
        const eligibilities = faculty.PersonalDataSheet.eligibilities;
        let hasProfessionalLicense = false;
        let hasCivilService = false;
        let hasBoardExam = false;

        eligibilities.forEach((elig) => {
          const careerService = elig.career_service
            ? elig.career_service.toLowerCase()
            : "";

          // Count total certifications
          certificationStats.total_certifications++;

          // Check for professional license (has license number)
          if (elig.license_number) {
            hasProfessionalLicense = true;
          }

          // Check for civil service eligibility
          if (
            careerService.includes("civil service") ||
            careerService.includes("csc") ||
            careerService.includes("career service")
          ) {
            hasCivilService = true;
          }

          // Check for board/bar exam
          if (
            careerService.includes("board") ||
            careerService.includes("bar") ||
            careerService.includes("licensure")
          ) {
            hasBoardExam = true;
          }
        });

        // Count faculty with each type (one faculty can have multiple)
        if (hasProfessionalLicense)
          certificationStats.with_professional_license++;
        if (hasCivilService) certificationStats.with_civil_service++;
        if (hasBoardExam) certificationStats.with_board_exam++;
      }

      // Professional License from Faculty Credentials
      if (
        faculty.faculty_credential &&
        faculty.faculty_credential.professional_license
      ) {
        const license = faculty.faculty_credential.professional_license.trim();
        if (
          license &&
          license.toLowerCase() !== "none" &&
          license.toLowerCase() !== "n/a"
        ) {
          // Count license types
          if (!professionalLicenseTypes[license]) {
            professionalLicenseTypes[license] = 0;
          }
          professionalLicenseTypes[license]++;
        }
      }

      // Appointment Nature
      if (
        faculty.faculty_credential &&
        faculty.faculty_credential.appointment_nature
      ) {
        const nature =
          faculty.faculty_credential.appointment_nature.toLowerCase();
        if (nature.includes("permanent")) appointmentNatureStats.permanent++;
        else if (nature.includes("temporary"))
          appointmentNatureStats.temporary++;
        else if (nature.includes("contractual") || nature.includes("contract"))
          appointmentNatureStats.contractual++;
        else if (nature.includes("part") || nature.includes("part-time"))
          appointmentNatureStats.part_time++;
        else appointmentNatureStats.others++;
      }

      // Training/Professional Development
      if (
        faculty.PersonalDataSheet &&
        faculty.PersonalDataSheet.trainings &&
        faculty.PersonalDataSheet.trainings.length > 0
      ) {
        const trainings = faculty.PersonalDataSheet.trainings;
        trainingStats.faculty_with_trainings++;
        trainingStats.total_trainings += trainings.length;

        trainings.forEach((training) => {
          // Sum total hours
          if (training.number_of_hours) {
            trainingStats.total_hours += parseFloat(training.number_of_hours);
          }

          // Count by type
          if (training.type_of_ld) {
            const type = training.type_of_ld.toLowerCase();
            if (type.includes("managerial")) trainingStats.by_type.managerial++;
            else if (type.includes("supervisory"))
              trainingStats.by_type.supervisory++;
            else if (type.includes("technical"))
              trainingStats.by_type.technical++;
            else trainingStats.by_type.others++;
          }
        });
      }
    });

    res.json({
      total_faculty: faculties.length,
      gender: genderStats,
      age_ranges: ageRanges,
      civil_status: civilStatusStats,
      citizenship: citizenshipStats,
      education: educationStats,
      credential_status: credentialStatusStats,
      certifications: certificationStats,
      professional_licenses: professionalLicenseTypes,
      appointment_nature: appointmentNatureStats,
      training: trainingStats,
    });
  } catch (error) {
    console.error("Get faculty demographics error:", error);
    res.status(500).json({ message: "Error fetching faculty demographics" });
  }
};

// Get education analytics (detailed breakdown)
exports.getEducationAnalytics = async (req, res) => {
  try {
    const deanUserId = req.user.user_id; // Fixed: use user_id instead of userId

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all active (non-archived) faculty with their education records from PDS
    const faculties = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.PersonalDataSheet,
          required: false,
          include: [
            {
              model: db.PDSEducation,
              as: "education",
              required: false,
              attributes: ["level", "degree_course", "year_graduated"],
            },
          ],
        },
      ],
    });

    // Education level breakdown
    const educationLevels = {
      elementary: 0,
      secondary: 0,
      vocational: 0,
      college: 0,
      graduate_studies: 0,
    };

    // Currently enrolled (based on year_graduated being null or future)
    const currentlyEnrolled = {
      masters: 0,
      doctorate: 0,
    };

    // Completed degrees
    const completedDegrees = {
      bachelors: 0,
      masters: 0,
      doctorate: 0,
    };

    const currentYear = new Date().getFullYear();

    faculties.forEach((faculty) => {
      if (faculty.PersonalDataSheet && faculty.PersonalDataSheet.education) {
        // Fixed: use PascalCase
        faculty.PersonalDataSheet.education.forEach((edu) => {
          const level = edu.level ? edu.level.toUpperCase() : "";

          // Count by level
          if (level === "ELEMENTARY") educationLevels.elementary++;
          else if (level === "SECONDARY") educationLevels.secondary++;
          else if (level === "VOCATIONAL") educationLevels.vocational++;
          else if (level === "COLLEGE") educationLevels.college++;
          else if (level === "GRADUATE STUDIES")
            educationLevels.graduate_studies++;

          // Check if currently enrolled (no year graduated or future year)
          const yearGraduated = edu.year_graduated
            ? parseInt(edu.year_graduated)
            : null;
          const isCurrentlyEnrolled =
            !yearGraduated || yearGraduated > currentYear;

          // Determine degree type from degree_course
          const degreeCourse = edu.degree_course
            ? edu.degree_course.toLowerCase()
            : "";

          if (level === "GRADUATE STUDIES") {
            if (
              degreeCourse.includes("doctor") ||
              degreeCourse.includes("phd") ||
              degreeCourse.includes("ph.d")
            ) {
              if (isCurrentlyEnrolled) {
                currentlyEnrolled.doctorate++;
              } else {
                completedDegrees.doctorate++;
              }
            } else if (
              degreeCourse.includes("master") ||
              degreeCourse.includes("ma ") ||
              degreeCourse.includes("ms ") ||
              degreeCourse.includes("mba")
            ) {
              if (isCurrentlyEnrolled) {
                currentlyEnrolled.masters++;
              } else {
                completedDegrees.masters++;
              }
            }
          } else if (level === "COLLEGE" && !isCurrentlyEnrolled) {
            completedDegrees.bachelors++;
          }
        });
      }
    });

    res.json({
      total_faculty: faculties.length,
      education_levels: educationLevels,
      currently_enrolled: currentlyEnrolled,
      completed_degrees: completedDegrees,
    });
  } catch (error) {
    console.error("Get education analytics error:", error);
    res.status(500).json({ message: "Error fetching education analytics" });
  }
};

// Get research and publications analytics
exports.getResearchAnalytics = async (req, res) => {
  try {
    const deanUserId = req.user.user_id; // Fixed: use user_id instead of userId

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all active (non-archived) faculty with their other info (which includes publications/research)
    const faculties = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.PersonalDataSheet,
          required: false,
          include: [
            {
              model: db.PDSOtherInfo,
              as: "other_info",
              required: false,
              attributes: ["info_type", "details"],
            },
          ],
        },
      ],
    });

    // Count faculty with publications/research
    let facultyWithPublications = 0;
    let totalPublications = 0;

    faculties.forEach((faculty) => {
      if (faculty.PersonalDataSheet && faculty.PersonalDataSheet.other_info) {
        // Fixed: use PascalCase
        const publications = faculty.PersonalDataSheet.other_info.filter(
          (info) =>
            info.info_type === "RECOGNITION" &&
            info.details &&
            (info.details.toLowerCase().includes("publication") ||
              info.details.toLowerCase().includes("research") ||
              info.details.toLowerCase().includes("journal") ||
              info.details.toLowerCase().includes("conference")),
        );

        if (publications.length > 0) {
          facultyWithPublications++;
          totalPublications += publications.length;
        }
      }
    });

    res.json({
      total_faculty: faculties.length,
      faculty_with_publications: facultyWithPublications,
      total_publications: totalPublications,
      percentage_with_publications:
        faculties.length > 0
          ? ((facultyWithPublications / faculties.length) * 100).toFixed(1)
          : 0,
    });
  } catch (error) {
    console.error("Get research analytics error:", error);
    res.status(500).json({ message: "Error fetching research analytics" });
  }
};
