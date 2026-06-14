const db = require("../models");
const FacultyCredential = db.FacultyCredential;
const CredentialCertificate = db.CredentialCertificate;
const Faculty = db.Faculty;
const path = require("path");
const fs = require("fs").promises;

// Create or update faculty credentials
exports.createOrUpdateCredentials = async (req, res) => {
	try {
		const userId = req.user.user_id;

		// Get faculty from user_id
		const faculty = await Faculty.findOne({ where: { user_id: userId } });
		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		const {
			education,
			educationObtainedWhere,
			educationObtainedWhen,
			professionalLicense,
			specialization,
			subjectsToTeach,
			appointmentNature,
			status,
			certificateCount,
		} = req.body;

		// Validate required fields
		if (
			!education ||
			!educationObtainedWhere ||
			!educationObtainedWhen ||
			!specialization ||
			!subjectsToTeach ||
			!appointmentNature ||
			!status
		) {
			return res
				.status(400)
				.json({ message: "Please fill in all required fields" });
		}

		// Handle file uploads
		const uploadDir = path.join(__dirname, "../uploads/credentials");
		await fs.mkdir(uploadDir, { recursive: true });

		const torFile = req.files?.tor?.[0];
		const pdsFile = req.files?.pds?.[0];
		const diplomaFile = req.files?.diploma?.[0];

		// Check if credentials already exist
		let credential = await FacultyCredential.findOne({
			where: { faculty_id: faculty.faculty_id },
		});

		// Only require all files if creating new credentials
		if (!credential && (!torFile || !pdsFile || !diplomaFile)) {
			return res
				.status(400)
				.json({
					message: "Please upload all required documents (TOR, PDS, Diploma)",
				});
		}

		// Validate TOR if provided
		if (torFile && torFile.mimetype !== "application/pdf") {
			return res.status(400).json({ message: "TOR must be a PDF file" });
		}

		// Save new files if provided
		let torPath = credential?.tor_file_path;
		let pdsPath = credential?.pds_file_path;
		let diplomaPath = credential?.diploma_file_path;

		if (torFile) {
			torPath = path.join(
				uploadDir,
				`${faculty.faculty_id}_tor_${Date.now()}${path.extname(torFile.originalname)}`,
			);
			await fs.writeFile(torPath, torFile.buffer);
		}
		if (pdsFile) {
			pdsPath = path.join(
				uploadDir,
				`${faculty.faculty_id}_pds_${Date.now()}${path.extname(pdsFile.originalname)}`,
			);
			await fs.writeFile(pdsPath, pdsFile.buffer);
		}
		if (diplomaFile) {
			diplomaPath = path.join(
				uploadDir,
				`${faculty.faculty_id}_diploma_${Date.now()}${path.extname(diplomaFile.originalname)}`,
			);
			await fs.writeFile(diplomaPath, diplomaFile.buffer);
		}

		const credentialData = {
			faculty_id: faculty.faculty_id,
			education,
			education_obtained_where: educationObtainedWhere,
			education_obtained_when: educationObtainedWhen,
			professional_license: professionalLicense || null,
			specialization,
			subjects_to_teach: subjectsToTeach,
			appointment_nature: appointmentNature,
			status,
			tor_file_path: torPath,
			pds_file_path: pdsPath,
			diploma_file_path: diplomaPath,
		};

		if (credential) {
			// Update existing credentials
			// Delete old files only if new files were uploaded
			if (torFile && credential.tor_file_path) {
				await fs.unlink(credential.tor_file_path).catch(() => {});
			}
			if (pdsFile && credential.pds_file_path) {
				await fs.unlink(credential.pds_file_path).catch(() => {});
			}
			if (diplomaFile && credential.diploma_file_path) {
				await fs.unlink(credential.diploma_file_path).catch(() => {});
			}

			await credential.update(credentialData);
		} else {
			// Create new credentials
			credential = await FacultyCredential.create(credentialData);
		}

		// Handle certificates
		if (certificateCount && parseInt(certificateCount) > 0) {
			const count = parseInt(certificateCount);
			const existingCertIds = [];

			for (let i = 0; i < count; i++) {
				const certName = req.body[`certificate_${i}_name`];
				const certId = req.body[`certificate_${i}_id`];
				const certFile = req.files?.[`certificate_${i}_file`]?.[0];

				if (certName) {
					if (certId) {
						// Existing certificate - update it
						existingCertIds.push(certId);
						const existingCert = await CredentialCertificate.findOne({
							where: { id: certId, credential_id: credential.id },
						});

						if (existingCert) {
							// Update certificate name
							await existingCert.update({ certificate_name: certName });

							// If new file provided, replace the old one
							if (certFile) {
								// Delete old file
								if (existingCert.file_path) {
									await fs.unlink(existingCert.file_path).catch(() => {});
								}

								// Save new file
								const certPath = path.join(
									uploadDir,
									`${faculty.faculty_id}_cert_${certId}_${Date.now()}${path.extname(certFile.originalname)}`,
								);
								await fs.writeFile(certPath, certFile.buffer);
								await existingCert.update({ file_path: certPath });
							}
						}
					} else if (certFile) {
						// New certificate - create it
						const certPath = path.join(
							uploadDir,
							`${faculty.faculty_id}_cert_${i}_${Date.now()}${path.extname(certFile.originalname)}`,
						);

						await fs.writeFile(certPath, certFile.buffer);

						await CredentialCertificate.create({
							credential_id: credential.id,
							certificate_name: certName,
							file_path: certPath,
						});
					}
				}
			}

			// Delete certificates that are no longer in the list
			const allCertificates = await CredentialCertificate.findAll({
				where: { credential_id: credential.id },
			});

			for (const cert of allCertificates) {
				if (!existingCertIds.includes(cert.id.toString())) {
					// Delete file
					if (cert.file_path) {
						await fs.unlink(cert.file_path).catch(() => {});
					}
					// Delete record
					await cert.destroy();
				}
			}
		} else if (credential) {
			// No certificates sent - delete all existing ones
			const oldCertificates = await CredentialCertificate.findAll({
				where: { credential_id: credential.id },
			});

			for (const oldCert of oldCertificates) {
				if (oldCert.file_path) {
					await fs.unlink(oldCert.file_path).catch(() => {});
				}
				await oldCert.destroy();
			}
		}

		res.status(200).json({
			message: "Credentials saved successfully",
			credential,
		});
	} catch (error) {
		console.error("Error saving credentials:", error);
		res
			.status(500)
			.json({ message: "Failed to save credentials", error: error.message });
	}
};

// Get faculty credentials
exports.getCredentials = async (req, res) => {
	try {
		const userId = req.user.user_id;

		// Get faculty from user_id
		const faculty = await Faculty.findOne({ where: { user_id: userId } });
		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		// Get credentials with certificates
		const credential = await FacultyCredential.findOne({
			where: { faculty_id: faculty.faculty_id },
			include: [
				{
					model: CredentialCertificate,
					as: "credential_certificates",
				},
			],
		});

		if (!credential) {
			return res.status(404).json({ message: "No credentials found" });
		}

		res.status(200).json(credential);
	} catch (error) {
		console.error("Error fetching credentials:", error);
		res
			.status(500)
			.json({ message: "Failed to fetch credentials", error: error.message });
	}
};

// Download file
exports.downloadFile = async (req, res) => {
	try {
		const { fileType } = req.params;
		const userId = req.user.user_id;

		const faculty = await Faculty.findOne({ where: { user_id: userId } });
		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		const credential = await FacultyCredential.findOne({
			where: { faculty_id: faculty.faculty_id },
		});

		if (!credential) {
			return res.status(404).json({ message: "No credentials found" });
		}

		let filePath;
		switch (fileType) {
			case "tor":
				filePath = credential.tor_file_path;
				break;
			case "pds":
				filePath = credential.pds_file_path;
				break;
			case "diploma":
				filePath = credential.diploma_file_path;
				break;
			default:
				return res.status(400).json({ message: "Invalid file type" });
		}

		if (!filePath) {
			return res.status(404).json({ message: "File not found" });
		}

		res.download(filePath);
	} catch (error) {
		console.error("Error downloading file:", error);
		res
			.status(500)
			.json({ message: "Failed to download file", error: error.message });
	}
};

// Download certificate
exports.downloadCertificate = async (req, res) => {
	try {
		const { certificateId } = req.params;
		const userId = req.user.user_id;

		const faculty = await Faculty.findOne({ where: { user_id: userId } });
		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		const certificate = await CredentialCertificate.findOne({
			where: { id: certificateId },
			include: [
				{
					model: FacultyCredential,
					where: { faculty_id: faculty.faculty_id },
				},
			],
		});

		if (!certificate) {
			return res.status(404).json({ message: "Certificate not found" });
		}

		if (!certificate.file_path) {
			return res.status(404).json({ message: "Certificate file not found" });
		}

		res.download(certificate.file_path);
	} catch (error) {
		console.error("Error downloading certificate:", error);
		res
			.status(500)
			.json({
				message: "Failed to download certificate",
				error: error.message,
			});
	}
};
