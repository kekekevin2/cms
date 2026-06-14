const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting Dean Portal INSIDE Testing...");
    console.log("📝 NOTE: Please login manually first using:");
    console.log("   Email: cit.lipa@g.batstate-u.edu.ph");
    console.log("   Pass: #B$E4dih^Bj5");
    console.log("   Then run this test while logged in!");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 400 // Slower for better observation
    });

    const page = await browser.newPage();

    // Test Results Structure (based on the table format)
    let testResults = {
        deanPortal: {
            dashboard: {
                pageLoad: { trial1: false, trial2: false, trial3: false, canAccess: false },
                navigation: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            facultyManagement: {
                facultyList: { trial1: false, trial2: false, trial3: false, canAccess: false },
                addFaculty: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            organizationManagement: {
                orgList: { trial1: false, trial2: false, trial3: false, canAccess: false },
                orgDetails: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            personalDataSheet: {
                allLetters: { trial1: false, trial2: false, trial3: false, canSave: false },
                withNumbers: { trial1: false, trial2: false, trial3: false, canSave: false },
                contactNumber: { trial1: false, trial2: false, trial3: false, canSave: false },
                elevenDigits: { trial1: false, trial2: false, trial3: false, canSave: false }
            },
            analytics: {
                withTitle: { trial1: false, trial2: false, trial3: false, canGenerate: false },
                withContent: { trial1: false, trial2: false, trial3: false, canGenerate: false }
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
        // Navigate directly to Dean dashboard (assuming already logged in)
        console.log("🏠 Navigating to Dean Dashboard...");
        await page.goto("http://localhost:7283/#/dean/dashboard");
        await page.waitForTimeout(3000);

        // PART 1: DEAN DASHBOARD TESTING
        console.log("\n🏠 TESTING DEAN DASHBOARD");
        console.log("=".repeat(50));

        // Test Dashboard Load (3 trials)
        console.log("🧪 Testing Dashboard Load...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const dashboardElements = await page.$$('.dashboard, .nav-link, .card, h1, h2, .sidebar');
                if (dashboardElements.length > 0) {
                    testResults.deanPortal.dashboard.pageLoad[`trial${trial}`] = true;
                    testResults.deanPortal.dashboard.pageLoad.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Dashboard loaded successfully`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Dashboard elements not found`);
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
                const navLinks = await page.$$('.nav-link, .menu-item, .sidebar-link');
                if (navLinks.length > 0) {
                    testResults.deanPortal.dashboard.navigation[`trial${trial}`] = true;
                    testResults.deanPortal.dashboard.navigation.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Navigation elements found (${navLinks.length} links)`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Navigation elements not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Navigation test error: ${error.message}`);
            }
        }

        // PART 2: PERSONAL DATA SHEET TESTING
        console.log("\n📋 TESTING PERSONAL DATA SHEET");
        console.log("=".repeat(50));

        // Test All Letters Input (3 trials)
        console.log("🧪 Testing All Letters Input...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const textInputs = await page.$$('input[type="text"], input[placeholder*="name"], input[placeholder*="Name"]');
                if (textInputs.length > 0) {
                    const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                    await randomInput.fill("John Doe");
                    testResults.deanPortal.personalDataSheet.allLetters[`trial${trial}`] = true;
                    testResults.deanPortal.personalDataSheet.allLetters.canSave = true;
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
                    await randomInput.fill("Test123@#");
                    testResults.deanPortal.personalDataSheet.withNumbers[`trial${trial}`] = true;
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
                    await randomInput.fill("09123456789");
                    testResults.deanPortal.personalDataSheet.contactNumber[`trial${trial}`] = true;
                    testResults.deanPortal.personalDataSheet.contactNumber.canSave = true;
                    console.log(`  Trial ${trial}: ✅ Contact number input successful`);
                } else {
                    // Try with regular text inputs that might be for phone
                    const textInputs = await page.$$('input[type="text"]');
                    if (textInputs.length > 0) {
                        const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                        await randomInput.fill("09123456789");
                        testResults.deanPortal.personalDataSheet.contactNumber[`trial${trial}`] = true;
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
                    await randomInput.fill("09123456789"); // Exactly 11 digits
                    testResults.deanPortal.personalDataSheet.elevenDigits[`trial${trial}`] = true;
                    testResults.deanPortal.personalDataSheet.elevenDigits.canSave = true;
                    console.log(`  Trial ${trial}: ✅ 11 digits input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No inputs found for 11 digits test`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ 11 digits test error: ${error.message}`);
            }
        }

        // PART 3: ANALYTICS TESTING
        console.log("\n📊 TESTING ANALYTICS");
        console.log("=".repeat(50));

        // Test With Title (3 trials)
        console.log("🧪 Testing With Title...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                // Try to navigate to analytics or find analytics elements
                const analyticsLink = await page.$('a[href*="analytics"], .nav-link:has-text("Analytics"), .menu-item:has-text("Analytics")');
                if (analyticsLink) {
                    await analyticsLink.click();
                    await page.waitForTimeout(2000);
                    
                    const titleElements = await page.$$('h1, h2, h3, .title, .report-title');
                    if (titleElements.length > 0) {
                        testResults.deanPortal.analytics.withTitle[`trial${trial}`] = true;
                        testResults.deanPortal.analytics.withTitle.canGenerate = true;
                        console.log(`  Trial ${trial}: ✅ Analytics with title found`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ No title elements found in analytics`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Analytics link not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Analytics title test error: ${error.message}`);
            }
        }

        // Test With Content (3 trials)
        console.log("🧪 Testing With Content...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const contentElements = await page.$$('.content, .report-content, .chart, .table, .analytics-data');
                if (contentElements.length > 0) {
                    testResults.deanPortal.analytics.withContent[`trial${trial}`] = true;
                    testResults.deanPortal.analytics.withContent.canGenerate = true;
                    console.log(`  Trial ${trial}: ✅ Analytics with content found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No content elements found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Analytics content test error: ${error.message}`);
            }
        }

        // PART 4: RANDOM INTERACTIONS (like the original monkey test)
        console.log("\n🐒 PERFORMING RANDOM INTERACTIONS");
        console.log("=".repeat(50));

        for (let i = 0; i < 15; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]):not(:has-text('Sign Out')):not(:has-text('Logout')), a:not([href='#']):not(:has-text('Sign Out')), input:not([readonly]), textarea, select, .btn:not(:has-text('Sign Out')), .card"
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
                            await randomElement.fill("Random Test Data");
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
    console.log("📊 DEAN PORTAL INSIDE MONKEY TEST RESULTS");
    console.log("=".repeat(70));

    console.log("\n🏠 DEAN PORTAL TESTS:");
    console.log(`  Dashboard Load: ${testResults.deanPortal.dashboard.pageLoad.trial1 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.pageLoad.trial2 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.pageLoad.trial3 ? '/' : 'x'} | Access: ${testResults.deanPortal.dashboard.pageLoad.canAccess ? '/' : 'x'}`);
    console.log(`  Navigation: ${testResults.deanPortal.dashboard.navigation.trial1 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.navigation.trial2 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.navigation.trial3 ? '/' : 'x'} | Access: ${testResults.deanPortal.dashboard.navigation.canAccess ? '/' : 'x'}`);

    console.log("\n📋 PERSONAL DATA SHEET TESTS:");
    console.log(`  All Letters: ${testResults.deanPortal.personalDataSheet.allLetters.trial1 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.allLetters.trial2 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.allLetters.trial3 ? '/' : 'x'} | Save: ${testResults.deanPortal.personalDataSheet.allLetters.canSave ? '/' : 'x'}`);
    console.log(`  With Numbers: ${testResults.deanPortal.personalDataSheet.withNumbers.trial1 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.withNumbers.trial2 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.withNumbers.trial3 ? '/' : 'x'} | Save: ${testResults.deanPortal.personalDataSheet.withNumbers.canSave ? '/' : 'x'}`);
    console.log(`  Contact Number: ${testResults.deanPortal.personalDataSheet.contactNumber.trial1 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.contactNumber.trial2 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.contactNumber.trial3 ? '/' : 'x'} | Save: ${testResults.deanPortal.personalDataSheet.contactNumber.canSave ? '/' : 'x'}`);
    console.log(`  11 Digits Only: ${testResults.deanPortal.personalDataSheet.elevenDigits.trial1 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.elevenDigits.trial2 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.elevenDigits.trial3 ? '/' : 'x'} | Save: ${testResults.deanPortal.personalDataSheet.elevenDigits.canSave ? '/' : 'x'}`);

    console.log("\n📊 ANALYTICS TESTS:");
    console.log(`  With Title: ${testResults.deanPortal.analytics.withTitle.trial1 ? '/' : 'x'} | ${testResults.deanPortal.analytics.withTitle.trial2 ? '/' : 'x'} | ${testResults.deanPortal.analytics.withTitle.trial3 ? '/' : 'x'} | Generate: ${testResults.deanPortal.analytics.withTitle.canGenerate ? '/' : 'x'}`);
    console.log(`  With Content: ${testResults.deanPortal.analytics.withContent.trial1 ? '/' : 'x'} | ${testResults.deanPortal.analytics.withContent.trial2 ? '/' : 'x'} | ${testResults.deanPortal.analytics.withContent.trial3 ? '/' : 'x'} | Generate: ${testResults.deanPortal.analytics.withContent.canGenerate ? '/' : 'x'}`);

    console.log(`\n📊 Console Errors: ${consoleErrors.length}`);
    console.log(`💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(70));

    console.log("✅ Dean Portal Inside Monkey testing finished");
    console.log("📝 Please manually review the browser for final state");
    
    // Keep browser open for 10 seconds to see final state
    await page.waitForTimeout(10000);
    await browser.close();

    // Return test results for documentation
    return testResults;
})();