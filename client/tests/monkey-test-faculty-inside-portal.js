const { chromium } = require("playwright");

(async () => {
    console.log("👨‍🏫 Starting Faculty Portal INSIDE Testing...");
    console.log("📝 NOTE: Please login manually first using:");
    console.log("   Email: shielamariep.calvelo@g.batstate-u.edu.ph");
    console.log("   Pass: NXpTNV02pIRR");
    console.log("   Then run this test while logged in!");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 400 // Slower for better observation
    });

    const page = await browser.newPage();

    // Test Results Structure (based on the table format)
    let testResults = {
        facultyPortal: {
            dashboard: {
                pageLoad: { trial1: false, trial2: false, trial3: false, canAccess: false },
                navigation: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            profile: {
                myProfile: { trial1: false, trial2: false, trial3: false, canAccess: false },
                editProfile: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            requirements: {
                viewRequirements: { trial1: false, trial2: false, trial3: false, canAccess: false },
                uploadDocuments: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            personalDataSheet: {
                allLetters: { trial1: false, trial2: false, trial3: false, canSave: false },
                withNumbers: { trial1: false, trial2: false, trial3: false, canSave: false },
                contactNumber: { trial1: false, trial2: false, trial3: false, canSave: false },
                elevenDigits: { trial1: false, trial2: false, trial3: false, canSave: false }
            },
            documents: {
                withTitle: { trial1: false, trial2: false, trial3: false, canPublish: false },
                withContent: { trial1: false, trial2: false, trial3: false, canPublish: false }
            }
        }
    };

    let consoleErrors = [];
    let pageErrors = [];

    page.on("console", msg => {
        if (msg.type() === "error") {
            consoleErrors.push(msg.text());
            console.log("❌ Console Error:", msg.text());
        }
    });

    page.on("pageerror", err => {
        pageErrors.push(err.message);
        console.log("💥 Page Error:", err.message);
    });

    try {
        // Navigate directly to Faculty dashboard (assuming already logged in)
        console.log("📚 Navigating to Faculty Dashboard...");
        await page.goto("http://localhost:7283/#/faculty/dashboard");
        await page.waitForTimeout(3000);

        // PART 1: FACULTY DASHBOARD TESTING
        console.log("\n📚 TESTING FACULTY DASHBOARD");
        console.log("=".repeat(50));

        // Test Dashboard Load (3 trials)
        console.log("🧪 Testing Dashboard Load...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const dashboardElements = await page.$$('.dashboard, .nav-link, .card, h1, h2, .sidebar, .faculty-dashboard');
                if (dashboardElements.length > 0) {
                    testResults.facultyPortal.dashboard.pageLoad[`trial${trial}`] = true;
                    testResults.facultyPortal.dashboard.pageLoad.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Faculty Dashboard loaded successfully`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Faculty Dashboard elements not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Dashboard test error: ${error.message}`);
            }
        }

        // Test Navigation (3 trials)
        console.log("🧪 Testing Navigation...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const navLinks = await page.$$('.nav-link, .menu-item, .sidebar-link, a[href*="faculty"]');
                if (navLinks.length > 0) {
                    testResults.facultyPortal.dashboard.navigation[`trial${trial}`] = true;
                    testResults.facultyPortal.dashboard.navigation.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Faculty Navigation elements found (${navLinks.length} links)`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Faculty Navigation elements not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Navigation test error: ${error.message}`);
            }
        }

        // PART 2: FACULTY PROFILE TESTING
        console.log("\n👤 TESTING FACULTY PROFILE");
        console.log("=".repeat(50));

        // Test My Profile Access (3 trials)
        console.log("🧪 Testing My Profile Access...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const profileLink = await page.$('a[href*="profile"], .nav-link:has-text("Profile"), .menu-item:has-text("Profile"), a:has-text("My Profile")');
                if (profileLink) {
                    await profileLink.click();
                    await page.waitForTimeout(2000);
                    
                    const profileElements = await page.$$('.profile, .profile-form, input, .form-group');
                    if (profileElements.length > 0) {
                        testResults.facultyPortal.profile.myProfile[`trial${trial}`] = true;
                        testResults.facultyPortal.profile.myProfile.canAccess = true;
                        console.log(`  Trial ${trial}: ✅ Faculty Profile accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Faculty Profile elements not found`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Profile link not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Profile test error: ${error.message}`);
            }
        }

        // PART 3: REQUIREMENTS TESTING
        console.log("\n📋 TESTING FACULTY REQUIREMENTS");
        console.log("=".repeat(50));

        // Test Requirements Access (3 trials)
        console.log("🧪 Testing Requirements Access...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const reqLink = await page.$('a[href*="requirement"], .nav-link:has-text("Requirements"), .menu-item:has-text("Requirements")');
                if (reqLink) {
                    await reqLink.click();
                    await page.waitForTimeout(2000);
                    
                    const reqElements = await page.$$('.requirement, .requirement-list, .upload-btn, .document-item');
                    if (reqElements.length > 0) {
                        testResults.facultyPortal.requirements.viewRequirements[`trial${trial}`] = true;
                        testResults.facultyPortal.requirements.viewRequirements.canAccess = true;
                        console.log(`  Trial ${trial}: ✅ Faculty Requirements accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Faculty Requirements elements not found`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Requirements link not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Requirements test error: ${error.message}`);
            }
        }

        // PART 4: PERSONAL DATA SHEET TESTING
        console.log("\n📋 TESTING PERSONAL DATA SHEET");
        console.log("=".repeat(50));

        // Test All Letters Input (3 trials)
        console.log("🧪 Testing All Letters Input...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const textInputs = await page.$$('input[type="text"], input[placeholder*="name"], input[placeholder*="Name"]');
                if (textInputs.length > 0) {
                    const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                    await randomInput.fill("Shiela Marie Calvelo");
                    testResults.facultyPortal.personalDataSheet.allLetters[`trial${trial}`] = true;
                    testResults.facultyPortal.personalDataSheet.allLetters.canSave = true;
                    console.log(`  Trial ${trial}: ✅ All letters input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No text inputs found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ All letters test error: ${error.message}`);
            }
        }

        // Test With Numbers and Symbols (3 trials)
        console.log("🧪 Testing With Numbers and Symbols...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const textInputs = await page.$$('input[type="text"]');
                if (textInputs.length > 0) {
                    const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                    await randomInput.fill("Faculty123@#");
                    testResults.facultyPortal.personalDataSheet.withNumbers[`trial${trial}`] = true;
                    console.log(`  Trial ${trial}: ✅ Numbers and symbols input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No text inputs found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Numbers/symbols test error: ${error.message}`);
            }
        }

        // Test Contact Number (3 trials)
        console.log("🧪 Testing Contact Number...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const phoneInputs = await page.$$('input[type="tel"], input[placeholder*="phone"], input[placeholder*="contact"], input[placeholder*="number"]');
                if (phoneInputs.length > 0) {
                    const randomInput = phoneInputs[Math.floor(Math.random() * phoneInputs.length)];
                    await randomInput.fill("09876543210");
                    testResults.facultyPortal.personalDataSheet.contactNumber[`trial${trial}`] = true;
                    testResults.facultyPortal.personalDataSheet.contactNumber.canSave = true;
                    console.log(`  Trial ${trial}: ✅ Contact number input successful`);
                } else {
                    // Try with regular text inputs that might be for phone
                    const textInputs = await page.$$('input[type="text"]');
                    if (textInputs.length > 0) {
                        const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                        await randomInput.fill("09876543210");
                        testResults.facultyPortal.personalDataSheet.contactNumber[`trial${trial}`] = true;
                        console.log(`  Trial ${trial}: ✅ Contact number (text input) successful`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ No contact number inputs found`);
                    }
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Contact number test error: ${error.message}`);
            }
        }

        // Test 11 Digits Only (3 trials)
        console.log("🧪 Testing 11 Digits Only...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const inputs = await page.$$('input[type="text"], input[type="tel"]');
                if (inputs.length > 0) {
                    const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
                    await randomInput.fill("09876543210"); // Exactly 11 digits
                    testResults.facultyPortal.personalDataSheet.elevenDigits[`trial${trial}`] = true;
                    testResults.facultyPortal.personalDataSheet.elevenDigits.canSave = true;
                    console.log(`  Trial ${trial}: ✅ 11 digits input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No inputs found for 11 digits test`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ 11 digits test error: ${error.message}`);
            }
        }

        // PART 5: DOCUMENTS TESTING
        console.log("\n📄 TESTING FACULTY DOCUMENTS");
        console.log("=".repeat(50));

        // Test With Title (3 trials)
        console.log("🧪 Testing With Title...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const titleElements = await page.$$('h1, h2, h3, .title, .document-title, .page-title');
                if (titleElements.length > 0) {
                    testResults.facultyPortal.documents.withTitle[`trial${trial}`] = true;
                    testResults.facultyPortal.documents.withTitle.canPublish = true;
                    console.log(`  Trial ${trial}: ✅ Documents with title found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No title elements found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Documents title test error: ${error.message}`);
            }
        }

        // Test With Content (3 trials)
        console.log("🧪 Testing With Content...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const contentElements = await page.$$('.content, .document-content, .main-content, .card-body, p, div');
                if (contentElements.length > 0) {
                    testResults.facultyPortal.documents.withContent[`trial${trial}`] = true;
                    testResults.facultyPortal.documents.withContent.canPublish = true;
                    console.log(`  Trial ${trial}: ✅ Documents with content found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No content elements found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Documents content test error: ${error.message}`);
            }
        }

        // PART 6: RANDOM INTERACTIONS (like the original monkey test)
        console.log("\n🐒 PERFORMING RANDOM INTERACTIONS");
        console.log("=".repeat(50));

        for (let i = 0; i < 15; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]):not(:has-text('Sign Out')):not(:has-text('Logout')), a:not([href='#']):not(:has-text('Sign Out')):not(:has-text('Logout')), input:not([readonly]):not([type='file']), textarea, select, .btn:not(:has-text('Sign Out')):not(:has-text('Logout')), .card"
                );

                if (elements.length > 0) {
                    const randomElement = elements[Math.floor(Math.random() * elements.length)];
                    const tagName = await randomElement.evaluate(el => el.tagName);
                    const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                    const elementText = await randomElement.evaluate(el => el.textContent?.substring(0, 20) || '');

                    if (tagName === "INPUT" || tagName === "TEXTAREA") {
                        if (elementType === "checkbox" || elementType === "radio") {
                            await randomElement.click({ timeout: 2000 });
                            console.log(`  🖱️ Random Action ${i + 1}: Clicked ${elementType}`);
                        } else if (elementType !== "file") {
                            await randomElement.fill("Faculty Random Data");
                            console.log(`  ⌨️ Random Action ${i + 1}: Filled ${elementType}`);
                        }
                    } else {
                        await randomElement.click({ timeout: 2000 });
                        console.log(`  🖱️ Random Action ${i + 1}: Clicked "${elementText}"`);
                    }
                }
                await page.waitForTimeout(300);
            } catch (error) {
                console.log(`  ⚠️ Random Action ${i + 1} Error: ${error.message}`);
            }
        }

    } catch (mainError) {
        console.log("❌ Main Test Error:", mainError.message);
    }

    // Generate Results Summary in Table Format
    console.log("\n" + "=".repeat(70));
    console.log("📊 FACULTY PORTAL INSIDE MONKEY TEST RESULTS");
    console.log("=".repeat(70));

    console.log("\n📚 FACULTY PORTAL TESTS:");
    console.log(`  Dashboard Load: ${testResults.facultyPortal.dashboard.pageLoad.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.dashboard.pageLoad.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.dashboard.pageLoad.trial3 ? '/' : 'x'} | Access: ${testResults.facultyPortal.dashboard.pageLoad.canAccess ? '/' : 'x'}`);
    console.log(`  Navigation: ${testResults.facultyPortal.dashboard.navigation.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.dashboard.navigation.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.dashboard.navigation.trial3 ? '/' : 'x'} | Access: ${testResults.facultyPortal.dashboard.navigation.canAccess ? '/' : 'x'}`);

    console.log("\n👤 FACULTY PROFILE TESTS:");
    console.log(`  My Profile: ${testResults.facultyPortal.profile.myProfile.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.profile.myProfile.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.profile.myProfile.trial3 ? '/' : 'x'} | Access: ${testResults.facultyPortal.profile.myProfile.canAccess ? '/' : 'x'}`);

    console.log("\n📋 REQUIREMENTS TESTS:");
    console.log(`  View Requirements: ${testResults.facultyPortal.requirements.viewRequirements.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.requirements.viewRequirements.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.requirements.viewRequirements.trial3 ? '/' : 'x'} | Access: ${testResults.facultyPortal.requirements.viewRequirements.canAccess ? '/' : 'x'}`);

    console.log("\n📋 PERSONAL DATA SHEET TESTS:");
    console.log(`  All Letters: ${testResults.facultyPortal.personalDataSheet.allLetters.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.allLetters.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.allLetters.trial3 ? '/' : 'x'} | Save: ${testResults.facultyPortal.personalDataSheet.allLetters.canSave ? '/' : 'x'}`);
    console.log(`  With Numbers: ${testResults.facultyPortal.personalDataSheet.withNumbers.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.withNumbers.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.withNumbers.trial3 ? '/' : 'x'} | Save: ${testResults.facultyPortal.personalDataSheet.withNumbers.canSave ? '/' : 'x'}`);
    console.log(`  Contact Number: ${testResults.facultyPortal.personalDataSheet.contactNumber.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.contactNumber.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.contactNumber.trial3 ? '/' : 'x'} | Save: ${testResults.facultyPortal.personalDataSheet.contactNumber.canSave ? '/' : 'x'}`);
    console.log(`  11 Digits Only: ${testResults.facultyPortal.personalDataSheet.elevenDigits.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.elevenDigits.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.personalDataSheet.elevenDigits.trial3 ? '/' : 'x'} | Save: ${testResults.facultyPortal.personalDataSheet.elevenDigits.canSave ? '/' : 'x'}`);

    console.log("\n📄 DOCUMENTS TESTS:");
    console.log(`  With Title: ${testResults.facultyPortal.documents.withTitle.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.documents.withTitle.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.documents.withTitle.trial3 ? '/' : 'x'} | Publish: ${testResults.facultyPortal.documents.withTitle.canPublish ? '/' : 'x'}`);
    console.log(`  With Content: ${testResults.facultyPortal.documents.withContent.trial1 ? '/' : 'x'} | ${testResults.facultyPortal.documents.withContent.trial2 ? '/' : 'x'} | ${testResults.facultyPortal.documents.withContent.trial3 ? '/' : 'x'} | Publish: ${testResults.facultyPortal.documents.withContent.canPublish ? '/' : 'x'}`);

    console.log(`\n📊 Console Errors: ${consoleErrors.length}`);
    console.log(`💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(70));

    console.log("✅ Faculty Portal Inside Monkey testing finished");
    console.log("📝 Please manually review the browser for final state");
    
    // Keep browser open for 10 seconds to see final state
    await page.waitForTimeout(10000);
    await browser.close();

    // Return test results for documentation
    return testResults;
})();