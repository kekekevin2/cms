const { chromium } = require("playwright");

(async () => {
    console.log("👨‍🏫 Starting COMPLETE Faculty Portal Monkey Test...");
    
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
        facultyFeatures: {
            dashboard: { tested: false, actions: 0, errors: 0 },
            profile: { tested: false, actions: 0, errors: 0 },
            requirements: { tested: false, actions: 0, errors: 0 },
            documents: { tested: false, actions: 0, errors: 0 },
            credentials: { tested: false, actions: 0, errors: 0 }
        },
        totalActions: 0,
        totalErrors: 0,
        inputTests: 0,
        clickTests: 0,
        navigationTests: 0,
        formSubmissions: 0
    };

    try {
        // Step 1: Navigate to login page
        console.log("🌐 Navigating to login page...");
        await page.goto("http://localhost:7283");
        await page.waitForTimeout(2000);

        // Step 2: Login as Faculty
        console.log("🔐 Logging in as Faculty...");
        
        // Wait for login form to be visible
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        
        // Fill login credentials
        await page.fill('input[type="email"]', 'shielamariep.calvelo@g.batstate-u.edu.ph');
        await page.waitForTimeout(500);
        await page.fill('input[type="password"]', 'NXpTNV02pIRR');
        await page.waitForTimeout(500);
        
        // Click login button
        await page.click('button[type="submit"]');
        console.log("📤 Faculty login form submitted...");
        
        // Wait for login to complete
        await page.waitForTimeout(5000);
        
        // Check if login was successful
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('faculty') || currentUrl.includes('dashboard')) {
            testResults.loginSuccess = true;
            testResults.dashboardAccess = true;
            console.log("✅ Successfully logged into Faculty portal!");
        } else {
            // Try to detect if we're in the faculty portal
            const facultyElements = await page.$('.faculty-dashboard, .sidebar, .nav-link, h1, h2');
            if (facultyElements) {
                testResults.loginSuccess = true;
                testResults.dashboardAccess = true;
                console.log("✅ Faculty portal detected!");
            } else {
                console.log("❌ Login may have failed - still on login page");
                throw new Error("Faculty login failed");
            }
        }

        // Step 3: Test Faculty Dashboard
        console.log("\n📚 Testing Faculty Dashboard...");
        testResults.facultyFeatures.dashboard.tested = true;
        
        for (let i = 0; i < 20; i++) {
            try {
                testResults.totalActions++;
                testResults.facultyFeatures.dashboard.actions++;

                const elements = await page.$$(
                    "button:not([disabled]):not(:has-text('Sign Out')):not(:has-text('Logout')), a:not([href='#']):not(:has-text('Sign Out')):not(:has-text('Logout')), input:not([readonly]), textarea, select, .btn:not(:has-text('Sign Out')):not(:has-text('Logout')), .card, .nav-link:not(:has-text('Sign Out')):not(:has-text('Logout')), .menu-item:not(:has-text('Sign Out')):not(:has-text('Logout'))"
                );

                if (elements.length === 0) {
                    console.log("⚠️ No interactive elements found on faculty dashboard");
                    break;
                }

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                const elementText = await randomElement.evaluate(el => el.textContent?.substring(0, 25) || '');

                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 3000 });
                        testResults.clickTests++;
                        console.log(`  ☑️ Faculty Dashboard - Clicked ${elementType}`);
                    } else if (elementType === "file") {
                        console.log(`  📁 Faculty Dashboard - Skipped file input`);
                    } else {
                        await randomElement.fill("Faculty Test Data");
                        testResults.inputTests++;
                        console.log(`  ⌨️ Faculty Dashboard - Filled ${elementType}`);
                    }
                } else if (tagName === "A" && (elementText.includes("Profile") || elementText.includes("My Profile")) && !elementText.includes("Sign Out")) {
                    // Navigate to Profile section
                    await randomElement.click({ timeout: 3000 });
                    testResults.navigationTests++;
                    console.log(`  🔗 Faculty Dashboard - Navigated to Profile`);
                    await page.waitForTimeout(2000);
                    break; // Exit dashboard testing to test profile section
                } else if (tagName === "A" && (elementText.includes("Requirements") || elementText.includes("Document")) && !elementText.includes("Sign Out")) {
                    // Navigate to Requirements/Documents section
                    await randomElement.click({ timeout: 3000 });
                    testResults.navigationTests++;
                    console.log(`  🔗 Faculty Dashboard - Navigated to Requirements/Documents`);
                    await page.waitForTimeout(2000);
                    break; // Exit dashboard testing
                } else if (!elementText.includes("Sign Out") && !elementText.includes("Logout") && !elementText.includes("Forgot")) {
                    await randomElement.click({ timeout: 3000 });
                    testResults.clickTests++;
                    console.log(`  🖱️ Faculty Dashboard - Clicked "${elementText}"`);
                }

                await page.waitForTimeout(500);

            } catch (error) {
                testResults.totalErrors++;
                testResults.facultyFeatures.dashboard.errors++;
                console.log(`  ⚠️ Faculty Dashboard Error #${i}: ${error.message}`);
            }
        }

        // Step 4: Test Faculty Profile (if available)
        console.log("\n👤 Testing Faculty Profile...");
        try {
            // Try to navigate to profile section
            const profileLink = await page.$('a[href*="profile"], .nav-link:has-text("Profile"), .menu-item:has-text("Profile")');
            if (profileLink) {
                await profileLink.click();
                await page.waitForTimeout(3000);
                testResults.facultyFeatures.profile.tested = true;
                
                for (let i = 0; i < 15; i++) {
                    try {
                        testResults.totalActions++;
                        testResults.facultyFeatures.profile.actions++;

                        const elements = await page.$$("button, input:not([type='file']), textarea, select, .btn, .form-control");
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            const tagName = await randomElement.evaluate(el => el.tagName);
                            const elementType = await randomElement.evaluate(el => el.type || el.tagName);

                            if (tagName === "INPUT" || tagName === "TEXTAREA") {
                                if (elementType === "checkbox" || elementType === "radio") {
                                    await randomElement.click({ timeout: 2000 });
                                    testResults.clickTests++;
                                    console.log(`  ☑️ Profile - Clicked ${elementType}`);
                                } else {
                                    await randomElement.fill("Profile Test Data");
                                    testResults.inputTests++;
                                    console.log(`  ⌨️ Profile - Filled ${elementType}`);
                                }
                            } else {
                                await randomElement.click({ timeout: 2000 });
                                testResults.clickTests++;
                                console.log(`  🖱️ Profile - Action #${i + 1}`);
                            }
                        }
                        await page.waitForTimeout(300);
                    } catch (error) {
                        testResults.totalErrors++;
                        testResults.facultyFeatures.profile.errors++;
                        console.log(`  ⚠️ Profile Error #${i}: ${error.message}`);
                    }
                }
            }
        } catch (profileError) {
            console.log(`❌ Profile section not accessible: ${profileError.message}`);
        }

        // Step 5: Test Faculty Requirements (if available)
        console.log("\n📋 Testing Faculty Requirements...");
        try {
            const reqLink = await page.$('a[href*="requirement"], .nav-link:has-text("Requirements"), .menu-item:has-text("Requirements")');
            if (reqLink) {
                await reqLink.click();
                await page.waitForTimeout(3000);
                testResults.facultyFeatures.requirements.tested = true;
                
                for (let i = 0; i < 15; i++) {
                    try {
                        testResults.totalActions++;
                        testResults.facultyFeatures.requirements.actions++;

                        const elements = await page.$$("button, input, select, .btn, .upload-btn, .requirement-item");
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                            
                            if (elementType !== "file") {
                                await randomElement.click({ timeout: 2000 });
                                testResults.clickTests++;
                                console.log(`  🖱️ Requirements - Action #${i + 1}`);
                            } else {
                                console.log(`  📁 Requirements - Skipped file input #${i + 1}`);
                            }
                        }
                        await page.waitForTimeout(300);
                    } catch (error) {
                        testResults.totalErrors++;
                        testResults.facultyFeatures.requirements.errors++;
                        console.log(`  ⚠️ Requirements Error #${i}: ${error.message}`);
                    }
                }
            }
        } catch (reqError) {
            console.log(`❌ Requirements section not accessible: ${reqError.message}`);
        }

        // Step 6: Test Faculty Documents (if available)
        console.log("\n📄 Testing Faculty Documents...");
        try {
            const docLink = await page.$('a[href*="document"], .nav-link:has-text("Documents"), .menu-item:has-text("Documents")');
            if (docLink) {
                await docLink.click();
                await page.waitForTimeout(3000);
                testResults.facultyFeatures.documents.tested = true;
                
                for (let i = 0; i < 10; i++) {
                    try {
                        testResults.totalActions++;
                        testResults.facultyFeatures.documents.actions++;

                        const elements = await page.$$("button, .btn, .document-item, .view-btn, .download-btn");
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            await randomElement.click({ timeout: 2000 });
                            testResults.clickTests++;
                            console.log(`  🖱️ Documents - Action #${i + 1}`);
                        }
                        await page.waitForTimeout(300);
                    } catch (error) {
                        testResults.totalErrors++;
                        testResults.facultyFeatures.documents.errors++;
                        console.log(`  ⚠️ Documents Error #${i}: ${error.message}`);
                    }
                }
            }
        } catch (docError) {
            console.log(`❌ Documents section not accessible: ${docError.message}`);
        }

    } catch (mainError) {
        console.log("❌ Main Faculty Test Error:", mainError.message);
        testResults.totalErrors++;
    }

    // Calculate success rate
    const successRate = testResults.totalActions > 0 ? 
        ((testResults.totalActions - testResults.totalErrors) / testResults.totalActions * 100).toFixed(1) : 0;

    // Generate comprehensive results
    console.log("\n" + "=".repeat(70));
    console.log("📊 COMPLETE FACULTY PORTAL MONKEY TEST RESULTS");
    console.log("=".repeat(70));
    console.log(`🔐 Login Success: ${testResults.loginSuccess ? '✅ YES' : '❌ NO'}`);
    console.log(`📚 Dashboard Access: ${testResults.dashboardAccess ? '✅ YES' : '❌ NO'}`);
    console.log(`\n📋 FEATURE TESTING RESULTS:`);
    console.log(`  📚 Dashboard: ${testResults.facultyFeatures.dashboard.tested ? '✅' : '❌'} (${testResults.facultyFeatures.dashboard.actions} actions, ${testResults.facultyFeatures.dashboard.errors} errors)`);
    console.log(`  👤 Profile: ${testResults.facultyFeatures.profile.tested ? '✅' : '❌'} (${testResults.facultyFeatures.profile.actions} actions, ${testResults.facultyFeatures.profile.errors} errors)`);
    console.log(`  📋 Requirements: ${testResults.facultyFeatures.requirements.tested ? '✅' : '❌'} (${testResults.facultyFeatures.requirements.actions} actions, ${testResults.facultyFeatures.requirements.errors} errors)`);
    console.log(`  📄 Documents: ${testResults.facultyFeatures.documents.tested ? '✅' : '❌'} (${testResults.facultyFeatures.documents.actions} actions, ${testResults.facultyFeatures.documents.errors} errors)`);
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

    console.log("✅ Complete Faculty Portal Monkey testing finished");
    
    // Keep browser open for 5 seconds to see final state
    await page.waitForTimeout(5000);
    await browser.close();
})();