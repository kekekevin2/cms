const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting STRUCTURED Dean Portal Monkey Test...");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slower for better observation
    });

    const page = await browser.newPage();

    // Test Results Structure (based on the table format)
    let testResults = {
        login: {
            username: {
                invalidUsername: { trial1: false, trial2: false, trial3: false, canAccess: false },
                validUsername: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            password: {
                invalidPassword: { trial1: false, trial2: false, trial3: false, canAccess: false },
                validPassword: { trial1: false, trial2: false, trial3: false, canAccess: false }
            }
        },
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
                formFields: { trial1: false, trial2: false, trial3: false, canSave: false },
                validation: { trial1: false, trial2: false, trial3: false, canSave: false }
            },
            analytics: {
                facultyAnalytics: { trial1: false, trial2: false, trial3: false, canGenerate: false },
                reports: { trial1: false, trial2: false, trial3: false, canGenerate: false }
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
        // PART 1: LOGIN TESTING
        console.log("\n🔐 TESTING LOGIN FUNCTIONALITY");
        console.log("=".repeat(50));

        // Navigate to login page
        await page.goto("http://localhost:7283");
        await page.waitForTimeout(2000);

        // Test 1: Invalid Username (3 trials)
        console.log("🧪 Testing Invalid Username...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                await page.fill('input[type="email"]', 'invalid@email.com');
                await page.fill('input[type="password"]', 'wrongpassword');
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);
                
                const currentUrl = page.url();
                if (currentUrl.includes('dean') || currentUrl.includes('dashboard')) {
                    testResults.login.username.invalidUsername[`trial${trial}`] = true;
                    console.log(`  Trial ${trial}: ❌ Should not have logged in with invalid username`);
                } else {
                    testResults.login.username.invalidUsername[`trial${trial}`] = false;
                    console.log(`  Trial ${trial}: ✅ Correctly rejected invalid username`);
                }
                
                // Clear fields for next trial
                await page.fill('input[type="email"]', '');
                await page.fill('input[type="password"]', '');
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Error testing invalid username: ${error.message}`);
            }
        }

        // Test 2: Valid Username with Invalid Password (3 trials)
        console.log("🧪 Testing Valid Username with Invalid Password...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                await page.fill('input[type="email"]', 'cit.lipa@g.batstate-u.edu.ph');
                await page.fill('input[type="password"]', 'wrongpassword');
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);
                
                const currentUrl = page.url();
                if (currentUrl.includes('dean') || currentUrl.includes('dashboard')) {
                    testResults.login.password.invalidPassword[`trial${trial}`] = true;
                    console.log(`  Trial ${trial}: ❌ Should not have logged in with invalid password`);
                } else {
                    testResults.login.password.invalidPassword[`trial${trial}`] = false;
                    console.log(`  Trial ${trial}: ✅ Correctly rejected invalid password`);
                }
                
                // Clear fields for next trial
                await page.fill('input[type="email"]', '');
                await page.fill('input[type="password"]', '');
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Error testing invalid password: ${error.message}`);
            }
        }

        // Test 3: Valid Credentials (3 trials)
        console.log("🧪 Testing Valid Dean Credentials...");
        let loginSuccess = false;
        for (let trial = 1; trial <= 3; trial++) {
            try {
                await page.fill('input[type="email"]', 'cit.lipa@g.batstate-u.edu.ph');
                await page.fill('input[type="password"]', '#B$E4dih^Bj5');
                await page.click('button[type="submit"]');
                await page.waitForTimeout(3000);
                
                const currentUrl = page.url();
                if (currentUrl.includes('dean') || currentUrl.includes('dashboard')) {
                    testResults.login.username.validUsername[`trial${trial}`] = true;
                    testResults.login.password.validPassword[`trial${trial}`] = true;
                    testResults.login.username.validUsername.canAccess = true;
                    testResults.login.password.validPassword.canAccess = true;
                    loginSuccess = true;
                    console.log(`  Trial ${trial}: ✅ Successfully logged in to Dean portal`);
                    break; // Exit loop on successful login
                } else {
                    console.log(`  Trial ${trial}: ❌ Login failed, retrying...`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Error during login: ${error.message}`);
            }
        }

        if (!loginSuccess) {
            throw new Error("Failed to login after 3 attempts");
        }

        // PART 2: DEAN PORTAL FEATURES TESTING
        console.log("\n🏠 TESTING DEAN PORTAL FEATURES");
        console.log("=".repeat(50));

        // Test Dashboard Access (3 trials)
        console.log("🧪 Testing Dashboard Access...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                // Check if dashboard elements are present
                const dashboardElements = await page.$$('.dashboard, .nav-link, .card, h1, h2');
                if (dashboardElements.length > 0) {
                    testResults.deanPortal.dashboard.pageLoad[`trial${trial}`] = true;
                    testResults.deanPortal.dashboard.pageLoad.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Dashboard loaded successfully`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Dashboard elements not found`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Dashboard test error: ${error.message}`);
            }
        }

        // Test Navigation (3 trials)
        console.log("🧪 Testing Navigation...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const navLinks = await page.$$('.nav-link, .menu-item, a[href*="faculty"], a[href*="organization"]');
                if (navLinks.length > 0) {
                    testResults.deanPortal.dashboard.navigation[`trial${trial}`] = true;
                    testResults.deanPortal.dashboard.navigation.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Navigation elements found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Navigation elements not found`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Navigation test error: ${error.message}`);
            }
        }

        // Test Faculty Management (3 trials)
        console.log("🧪 Testing Faculty Management...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const facultyLink = await page.$('a[href*="faculty"], .nav-link:has-text("Faculty")');
                if (facultyLink) {
                    await facultyLink.click();
                    await page.waitForTimeout(2000);
                    
                    const facultyElements = await page.$$('.faculty-list, .faculty-card, .add-faculty, table');
                    if (facultyElements.length > 0) {
                        testResults.deanPortal.facultyManagement.facultyList[`trial${trial}`] = true;
                        testResults.deanPortal.facultyManagement.facultyList.canAccess = true;
                        console.log(`  Trial ${trial}: ✅ Faculty management accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Faculty management not accessible`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Faculty link not found`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Faculty management test error: ${error.message}`);
            }
        }

        // Test Personal Data Sheet (3 trials)
        console.log("🧪 Testing Personal Data Sheet...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const pdsElements = await page.$$('input[type="text"], input[type="email"], textarea, select, input[type="radio"], input[type="checkbox"]');
                if (pdsElements.length > 0) {
                    // Test form field interactions
                    const randomInput = pdsElements[Math.floor(Math.random() * pdsElements.length)];
                    const inputType = await randomInput.evaluate(el => el.type);
                    
                    if (inputType === 'text' || inputType === 'email') {
                        await randomInput.fill('Test Data');
                        testResults.deanPortal.personalDataSheet.formFields[`trial${trial}`] = true;
                        testResults.deanPortal.personalDataSheet.formFields.canSave = true;
                        console.log(`  Trial ${trial}: ✅ Form field interaction successful`);
                    } else if (inputType === 'radio' || inputType === 'checkbox') {
                        await randomInput.click();
                        testResults.deanPortal.personalDataSheet.formFields[`trial${trial}`] = true;
                        console.log(`  Trial ${trial}: ✅ Radio/Checkbox interaction successful`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ No form elements found`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ PDS test error: ${error.message}`);
            }
        }

        // Test Analytics (3 trials)
        console.log("🧪 Testing Analytics...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const analyticsLink = await page.$('a[href*="analytics"], .nav-link:has-text("Analytics")');
                if (analyticsLink) {
                    await analyticsLink.click();
                    await page.waitForTimeout(2000);
                    
                    const analyticsElements = await page.$$('.chart, .report, .analytics-card, .statistics');
                    if (analyticsElements.length > 0) {
                        testResults.deanPortal.analytics.facultyAnalytics[`trial${trial}`] = true;
                        testResults.deanPortal.analytics.facultyAnalytics.canGenerate = true;
                        console.log(`  Trial ${trial}: ✅ Analytics accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Analytics not accessible`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Analytics link not found`);
                }
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Analytics test error: ${error.message}`);
            }
        }

    } catch (mainError) {
        console.log("❌ Main Test Error:", mainError.message);
    }

    // Generate Results Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 DEAN PORTAL STRUCTURED MONKEY TEST RESULTS");
    console.log("=".repeat(70));

    // Print results in table format
    console.log("\n🔐 LOGIN TESTS:");
    console.log(`  Invalid Username: ${testResults.login.username.invalidUsername.trial1 ? 'x' : '/'} | ${testResults.login.username.invalidUsername.trial2 ? 'x' : '/'} | ${testResults.login.username.invalidUsername.trial3 ? 'x' : '/'} | Access: ${testResults.login.username.invalidUsername.canAccess ? '/' : 'x'}`);
    console.log(`  Valid Username: ${testResults.login.username.validUsername.trial1 ? '/' : 'x'} | ${testResults.login.username.validUsername.trial2 ? '/' : 'x'} | ${testResults.login.username.validUsername.trial3 ? '/' : 'x'} | Access: ${testResults.login.username.validUsername.canAccess ? '/' : 'x'}`);
    console.log(`  Invalid Password: ${testResults.login.password.invalidPassword.trial1 ? 'x' : '/'} | ${testResults.login.password.invalidPassword.trial2 ? 'x' : '/'} | ${testResults.login.password.invalidPassword.trial3 ? 'x' : '/'} | Access: ${testResults.login.password.invalidPassword.canAccess ? '/' : 'x'}`);
    console.log(`  Valid Password: ${testResults.login.password.validPassword.trial1 ? '/' : 'x'} | ${testResults.login.password.validPassword.trial2 ? '/' : 'x'} | ${testResults.login.password.validPassword.trial3 ? '/' : 'x'} | Access: ${testResults.login.password.validPassword.canAccess ? '/' : 'x'}`);

    console.log("\n🏠 DEAN PORTAL TESTS:");
    console.log(`  Dashboard Load: ${testResults.deanPortal.dashboard.pageLoad.trial1 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.pageLoad.trial2 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.pageLoad.trial3 ? '/' : 'x'} | Access: ${testResults.deanPortal.dashboard.pageLoad.canAccess ? '/' : 'x'}`);
    console.log(`  Navigation: ${testResults.deanPortal.dashboard.navigation.trial1 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.navigation.trial2 ? '/' : 'x'} | ${testResults.deanPortal.dashboard.navigation.trial3 ? '/' : 'x'} | Access: ${testResults.deanPortal.dashboard.navigation.canAccess ? '/' : 'x'}`);
    console.log(`  Faculty Management: ${testResults.deanPortal.facultyManagement.facultyList.trial1 ? '/' : 'x'} | ${testResults.deanPortal.facultyManagement.facultyList.trial2 ? '/' : 'x'} | ${testResults.deanPortal.facultyManagement.facultyList.trial3 ? '/' : 'x'} | Access: ${testResults.deanPortal.facultyManagement.facultyList.canAccess ? '/' : 'x'}`);
    console.log(`  Form Fields: ${testResults.deanPortal.personalDataSheet.formFields.trial1 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.formFields.trial2 ? '/' : 'x'} | ${testResults.deanPortal.personalDataSheet.formFields.trial3 ? '/' : 'x'} | Save: ${testResults.deanPortal.personalDataSheet.formFields.canSave ? '/' : 'x'}`);
    console.log(`  Analytics: ${testResults.deanPortal.analytics.facultyAnalytics.trial1 ? '/' : 'x'} | ${testResults.deanPortal.analytics.facultyAnalytics.trial2 ? '/' : 'x'} | ${testResults.deanPortal.analytics.facultyAnalytics.trial3 ? '/' : 'x'} | Generate: ${testResults.deanPortal.analytics.facultyAnalytics.canGenerate ? '/' : 'x'}`);

    console.log(`\n📊 Console Errors: ${consoleErrors.length}`);
    console.log(`💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(70));

    console.log("✅ Structured Dean Portal Monkey testing finished");
    
    // Keep browser open for 5 seconds to see final state
    await page.waitForTimeout(5000);
    await browser.close();

    // Return test results for documentation
    return testResults;
})();