const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting COMPLETE Dean Portal Monkey Test...");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 300 // Slower for better observation
    });

    const page = await browser.newPage();

    // Error detection
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

    let testResults = {
        loginSuccess: false,
        dashboardAccess: false,
        deanFeatures: {
            dashboard: { tested: false, actions: 0, errors: 0 },
            faculty: { tested: false, actions: 0, errors: 0 },
            organizations: { tested: false, actions: 0, errors: 0 },
            profile: { tested: false, actions: 0, errors: 0 },
            analytics: { tested: false, actions: 0, errors: 0 }
        },
        totalActions: 0,
        totalErrors: 0,
        inputTests: 0,
        clickTests: 0,
        navigationTests: 0
    };

    try {
        // Step 1: Navigate to login page
        console.log("🌐 Navigating to login page...");
        await page.goto("http://localhost:7283");
        await page.waitForTimeout(2000);

        // Step 2: Login as Dean
        console.log("🔐 Logging in as Dean...");
        
        // Wait for login form to be visible
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        
        // Fill login credentials
        await page.fill('input[type="email"]', 'cit.lipa@g.batstate-u.edu.ph');
        await page.waitForTimeout(500);
        await page.fill('input[type="password"]', '#B$E4dih^Bj5');
        await page.waitForTimeout(500);
        
        // Click login button
        await page.click('button[type="submit"]');
        console.log("📤 Login form submitted...");
        
        // Wait for login to complete
        await page.waitForTimeout(5000);
        
        // Check if login was successful by looking for dean-specific elements
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('dean') || currentUrl.includes('dashboard')) {
            testResults.loginSuccess = true;
            testResults.dashboardAccess = true;
            console.log("✅ Successfully logged into Dean portal!");
        } else {
            // Try to detect if we're in the dean portal by looking for elements
            const deanElements = await page.$('.dean-dashboard, .sidebar, .nav-link, h1, h2');
            if (deanElements) {
                testResults.loginSuccess = true;
                testResults.dashboardAccess = true;
                console.log("✅ Dean portal detected!");
            } else {
                console.log("❌ Login may have failed - still on login page");
                throw new Error("Login failed");
            }
        }

        // Step 3: Test Dean Dashboard
        console.log("\n🏠 Testing Dean Dashboard...");
        testResults.deanFeatures.dashboard.tested = true;
        
        for (let i = 0; i < 20; i++) {
            try {
                testResults.totalActions++;
                testResults.deanFeatures.dashboard.actions++;

                const elements = await page.$$(
                    "button:not([disabled]), a:not([href='#']), input:not([readonly]), textarea, select, .btn, .card, .nav-link"
                );

                if (elements.length === 0) {
                    console.log("⚠️ No interactive elements found on dashboard");
                    break;
                }

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                const elementText = await randomElement.evaluate(el => el.textContent?.substring(0, 20) || '');

                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 3000 });
                        testResults.clickTests++;
                        console.log(`  ☑️ Dashboard - Clicked ${elementType}`);
                    } else if (elementType !== "file") {
                        await randomElement.fill("Test Data");
                        testResults.inputTests++;
                        console.log(`  ⌨️ Dashboard - Filled ${elementType}`);
                    }
                } else if (tagName === "A" && elementText.includes("Faculty")) {
                    // Navigate to Faculty section
                    await randomElement.click({ timeout: 3000 });
                    testResults.navigationTests++;
                    console.log(`  🔗 Dashboard - Navigated to Faculty`);
                    await page.waitForTimeout(2000);
                    break; // Exit dashboard testing to test faculty section
                } else if (tagName === "A" && elementText.includes("Organization")) {
                    // Navigate to Organization section
                    await randomElement.click({ timeout: 3000 });
                    testResults.navigationTests++;
                    console.log(`  🔗 Dashboard - Navigated to Organizations`);
                    await page.waitForTimeout(2000);
                    break; // Exit dashboard testing to test organization section
                } else {
                    await randomElement.click({ timeout: 3000 });
                    testResults.clickTests++;
                    console.log(`  🖱️ Dashboard - Clicked "${elementText}"`);
                }

                await page.waitForTimeout(500);

            } catch (error) {
                testResults.totalErrors++;
                testResults.deanFeatures.dashboard.errors++;
                console.log(`  ⚠️ Dashboard Error #${i}: ${error.message}`);
            }
        }

        // Step 4: Test Faculty Management (if available)
        console.log("\n👨‍🏫 Testing Faculty Management...");
        try {
            // Try to navigate to faculty section
            const facultyLink = await page.$('a[href*="faculty"], .nav-link:has-text("Faculty")');
            if (facultyLink) {
                await facultyLink.click();
                await page.waitForTimeout(3000);
                testResults.deanFeatures.faculty.tested = true;
                
                for (let i = 0; i < 15; i++) {
                    try {
                        testResults.totalActions++;
                        testResults.deanFeatures.faculty.actions++;

                        const elements = await page.$$("button, input, select, .btn, .table-row");
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            await randomElement.click({ timeout: 2000 });
                            testResults.clickTests++;
                            console.log(`  🖱️ Faculty - Action #${i + 1}`);
                        }
                        await page.waitForTimeout(300);
                    } catch (error) {
                        testResults.totalErrors++;
                        testResults.deanFeatures.faculty.errors++;
                        console.log(`  ⚠️ Faculty Error #${i}: ${error.message}`);
                    }
                }
            }
        } catch (facultyError) {
            console.log(`❌ Faculty section not accessible: ${facultyError.message}`);
        }

        // Step 5: Test Organization Management (if available)
        console.log("\n🏛️ Testing Organization Management...");
        try {
            const orgLink = await page.$('a[href*="organization"], .nav-link:has-text("Organization")');
            if (orgLink) {
                await orgLink.click();
                await page.waitForTimeout(3000);
                testResults.deanFeatures.organizations.tested = true;
                
                for (let i = 0; i < 15; i++) {
                    try {
                        testResults.totalActions++;
                        testResults.deanFeatures.organizations.actions++;

                        const elements = await page.$$("button, input, select, .btn, .card");
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            await randomElement.click({ timeout: 2000 });
                            testResults.clickTests++;
                            console.log(`  🖱️ Organizations - Action #${i + 1}`);
                        }
                        await page.waitForTimeout(300);
                    } catch (error) {
                        testResults.totalErrors++;
                        testResults.deanFeatures.organizations.errors++;
                        console.log(`  ⚠️ Organizations Error #${i}: ${error.message}`);
                    }
                }
            }
        } catch (orgError) {
            console.log(`❌ Organizations section not accessible: ${orgError.message}`);
        }

    } catch (mainError) {
        console.log("❌ Main Test Error:", mainError.message);
        testResults.totalErrors++;
    }

    // Calculate success rate
    const successRate = testResults.totalActions > 0 ? 
        ((testResults.totalActions - testResults.totalErrors) / testResults.totalActions * 100).toFixed(1) : 0;

    // Generate comprehensive results
    console.log("\n" + "=".repeat(70));
    console.log("📊 COMPLETE DEAN PORTAL MONKEY TEST RESULTS");
    console.log("=".repeat(70));
    console.log(`🔐 Login Success: ${testResults.loginSuccess ? '✅ YES' : '❌ NO'}`);
    console.log(`🏠 Dashboard Access: ${testResults.dashboardAccess ? '✅ YES' : '❌ NO'}`);
    console.log(`\n📋 FEATURE TESTING RESULTS:`);
    console.log(`  🏠 Dashboard: ${testResults.deanFeatures.dashboard.tested ? '✅' : '❌'} (${testResults.deanFeatures.dashboard.actions} actions, ${testResults.deanFeatures.dashboard.errors} errors)`);
    console.log(`  👨‍🏫 Faculty: ${testResults.deanFeatures.faculty.tested ? '✅' : '❌'} (${testResults.deanFeatures.faculty.actions} actions, ${testResults.deanFeatures.faculty.errors} errors)`);
    console.log(`  🏛️ Organizations: ${testResults.deanFeatures.organizations.tested ? '✅' : '❌'} (${testResults.deanFeatures.organizations.actions} actions, ${testResults.deanFeatures.organizations.errors} errors)`);
    console.log(`\n📈 INTERACTION SUMMARY:`);
    console.log(`  🔗 Navigation Tests: ${testResults.navigationTests}`);
    console.log(`  ⌨️ Input Tests: ${testResults.inputTests}`);
    console.log(`  🖱️ Click Tests: ${testResults.clickTests}`);
    console.log(`  📊 Total Actions: ${testResults.totalActions}`);
    console.log(`  ⚠️ Total Errors: ${testResults.totalErrors}`);
    console.log(`  ✅ Success Rate: ${successRate}%`);
    console.log(`  ❌ Console Errors: ${consoleErrors.length}`);
    console.log(`  💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(70));

    console.log("✅ Complete Dean Portal Monkey testing finished");
    
    // Keep browser open for 5 seconds to see final state
    await page.waitForTimeout(5000);
    await browser.close();
})();