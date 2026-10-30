const axios = require('axios');
const { getRecaptchaConfig } = require('../config/recaptcha.config');

/**
 * Middleware to verify Google reCAPTCHA token
 * Validates the reCAPTCHA v2 checkbox response from the client before allowing the request to proceed
 * 
 * Environment Variables Required:
 * - RECAPTCHA_SECRET_KEY: Your Google reCAPTCHA secret key
 * - RECAPTCHA_ENABLED: Set to 'true' to enable verification (can be disabled for development)
 * 
 * Usage:
 * router.post('/endpoint', verifyRecaptcha, controller.method);
 */
const verifyRecaptcha = async (req, res, next) => {
	let config;
	try {
		config = getRecaptchaConfig();
	} catch {
		return res.status(503).json({ message: 'reCAPTCHA is not configured' });
	}

	// Skip reCAPTCHA verification if disabled (for development/testing)
	if (!config.enabled) {
		console.log('⚠️  reCAPTCHA verification skipped (disabled in environment)');
		return next();
	}

	if (!config.siteKey || !config.secretKey) {
		return res.status(503).json({ message: 'reCAPTCHA is not configured' });
	}

	const recaptchaToken = req.body?.recaptchaToken;

	// Check if token is provided
	if (typeof recaptchaToken !== 'string' || !recaptchaToken.trim()) {
		console.log('❌ reCAPTCHA token missing');
		return res.status(400).json({
			message: 'reCAPTCHA verification required. Please complete the reCAPTCHA challenge.',
		});
	}

	try {
		// Verify token with Google reCAPTCHA API
		const response = await axios.post(
			'https://www.google.com/recaptcha/api/siteverify',
			new URLSearchParams({
				secret: config.secretKey,
				response: recaptchaToken,
			}).toString(),
			{
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				timeout: 10000,
			}
		);

		const { success, 'error-codes': errorCodes } = response.data;

		// Check if verification was successful
		if (success !== true) {
			console.error('❌ reCAPTCHA verification failed:', errorCodes);
			return res.status(400).json({
				message: 'reCAPTCHA verification failed. Please try again.',
				errors: errorCodes,
			});
		}

		// Verification successful
		console.log('✅ reCAPTCHA verification successful');
		
		// Attach verification result to request for logging
		req.recaptchaVerified = true;
		
		// Remove token from body to prevent it from being processed further
		delete req.body.recaptchaToken;
		
		next();
	} catch (error) {
		console.error('❌ reCAPTCHA verification error:', error.message);
		return res.status(500).json({
			message: 'reCAPTCHA verification service unavailable. Please try again later.',
		});
	}
};

module.exports = verifyRecaptcha;
