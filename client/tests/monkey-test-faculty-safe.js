const { chromium } = require("playwright");

(async () => {
    console.log("👨‍🏫 Starting SAFE Faculty Portal Monkey Test...");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 400 // Slower for better control
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
            throw new Error("Faculty login failed");
        }

        // Step 3: Test Faculty Dashboard (SAFE MODE - avoid logout buttons)
        console.log("\n📚 Testing Faculty Dashboard (Safe Mode)...");
        testResults.facultyFeatures.dashboard.tested = true;
        
        // Define safe elements to interact with (avoid logout/signout)
        const safeSelectors = [
            'input[type="text"]:not([readonly])',
            'input[type="email"]:not([readonly])',
            'input[type="number"]:not([readonly])',
            'textarea:not([readonly])',
            'select',
            'input[type="checkbox"]',
            'input[type="radio"]',
            'button:not(:has-text("Sign Out")):not(:has-text("Logout")):not(:has-text("Log Out"))',
            '.btn:not(:has-text("Sign Out")):not(:has-text("Logout")):not(:has-text("Log Out"))',
            '.nav-link:not(:has-text("Sign Out")):not(:has-text("Logout"))',
            '.card:not(:has-text("Sign Out"))',
            '.form-control',
            '.dropdown-toggle:not(:has-text("Sign Out"))'
        ];
        
        for (let i = 0; i < 25; i++) {
            try {
                testResults.totalActions++;
                testResults.facultyFeatures.dashboard.actions++;

                // Try each safe selector
                let elementFound = false;
                for (const selector of safeSelectors) {
                    try {
                        const elements = await page.$$(selector);
                        if (elements.length > 0) {
                            const randomElement = elements[Math.floor(Math.random() * elements.length)];
                            
                            // Check if element text contains logout-related words
                            const elementText = await randomElement.evaluate(el => el.textContent?.toLowerCase() || '');
                            if (elementText.includes('sign out') || elementText.includes('logout') || elementText.includes('log out')) {
                                continue; // Skip this element
                            }
                            
                            const tagName = await randomElement.evaluate(el => el.tagName);
                            const elementType = await randomElement.evaluate(el => el.type || el.tagName);

                            if (tagName === "INPUT" || tagName === "TEXTAREA") {
                                if (elementType === "checkbox" || elementType === "radio") {
                                    await randomElement.click({ timeout: 2000 });
                                    testResults.clickTests++;
                                    console.log(`  ☑️ Faculty Dashboard - Clicked ${elementType} (${selector})`);
                                } else if (elementType === "file") {
                                    console.log(`  📁 Faculty Dashboard - Skipped file input`);
                                } else {
                                    await randomElement.fill("Faculty Test Data");
                                    testResults.inputTests++;
                                    console.log(`  ⌨️ Faculty Dashboard - Filled ${elementType} (${selector})`);
                                }
                            } else if (tagName === "SELECT") {
                                const options = await randomElement.$$('option');
                                if (options.length > 1) {
                                    await randomElement.selectOption({ index: 1 });
                                    testResults.inputTests++;
                                    console.log(`  📋 Faculty Dashboard - Selected option (${selector})`);
                                }
                            } else {
                                await randomElement.click({ timeout: 2000 });
                                testResults.clickTests++;
                                console.log(`  🖱️ Faculty Dashboard - Clicked element (${selector})`);
                            }
                            
                            elementFound = true;
                            break; // Exit selector loop
                        }
                    } catch (selectorError) {
                        // Continue to next selector
                        continue;
                    }
                }
                
                if (!elementFound) {
                    console.log(`  ⚠️ No safe elements found for action #${i}`);
                }

                await page.waitForTimeout(600);

            } catch (error) {
                testResults.totalErrors++;
                testResults.facultyFeatures.dashboard.errors++;
                console.log(`  ⚠️ Faculty Dashboard Error #${i}: ${error.message}`);
            }
        }

        // Step 4: Test Faculty Profile Navigation (Safe)
        console.log("\n👤 Testing Faculty Profile Navigation...");
        try {
            // Look for profile-related navigation that's safe
            const profileSelectors = [
                'a[href*="profile"]:not(:has-text("Sign Out"))',
                '.nav-link:has-text("Profile"):not(:has-text("Sign Out"))',
                '.menu-item:has-text("Profile"):not(:has-text("Sign Out"))',
                'button:has-text("Profile"):not(:has-text("Sign Out"))'
            ];
            
            for (const selector of profileSelectors) {
                try {
                    const profileElement = await page.$(selector);
                    if (profileElement) {
                        const elementText = await profileElement.evaluate(el => el.textContent?.toLowerCase() || '');
                        if (!elementText.includes('sign out') && !elementText.includes('logout')) {
                            await profileElement.click({ timeout: 3000 });
                            testResults.navigationTests++;
                            testResults.facultyFeatures.profile.tested = true;
                            console.log(`  🔗 Successfully navigated to Faculty Profile`);
                            await page.waitForTimeout(3000);
                            
                            // Test profile page elements
                            for (let i = 0; i < 10; i++) {
                                try {
                                    testResults.totalActions++;
                                    testResults.facultyFeatures.profile.actions++;
                                    
                                    const profileElements = await page.$$('input:not([type="file"]):not([readonly]), textarea:not([readonly]), select, button:not(:has-text("Sign Out")):not(:has-text("Logout"))');
                                    if (profileElements.length > 0) {
                                        const randomElement = profileElements[Math.floor(Math.random() * profileElements.length)];
                                        const tagName = await randomElement.evaluate(el => el.tagName);
                                        const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                                        
                                        if (tagName === "INPUT" || tagName === "TEXTAREA") {
                                            if (elementType === "checkbox" || elementType === "radio") {
                                                await randomElement.click({ timeout: 2000 });
                                                testResults.clickTests++;
                                                console.log(`    ☑️ Profile - Clicked ${elementType}`);
                                            } else {
                                                await randomElement.fill("Profile Data");
                                                testResults.inputTests++;
                                                console.log(`    ⌨️ Profile - Filled ${elementType}`);
                                            }
                                        } else {
                                            await randomElement.click({ timeout: 2000 });
                                            testResults.clickTests++;
                                            console.log(`    🖱️ Profile - Clicked button`);
                                        }
                                    }
                                    await page.waitForTimeout(400);
                                } catch (profileError) {
                                    testResults.totalErrors++;
                                    testResults.facultyFeatures.profile.errors++;
                                    console.log(`    ⚠️ Profile Error #${i}: ${profileError.message}`);
                                }
                            }
                            break; // Exit selector loop
                        }
                    }
                } catch (navError) {
                    continue; // Try next selector
                }
            }
        } catch (profileError) {
            console.log(`❌ Profile navigation error: ${profileError.message}`);
        }

        // Step 5: Test Faculty Requirements (Safe)
        console.log("\n📋 Testing Faculty Requirements...");
        try {
            const reqSelectors = [
                'a[href*="requirement"]:not(:has-text("Sign Out"))',
                '.nav-link:has-text("Requirements"):not(:has-text("Sign Out"))',
                '.menu-item:has-text("Requirements"):not(:has-text("Sign Out"))'
            ];
            
            for (const selector of reqSelectors) {
                try {
                    const reqElement = await page.$(selector);
                    if (reqElement) {
                        await reqElement.click({ timeout: 3000 });
                        testResults.navigationTests++;
                        testResults.facultyFeatures.requirements.tested = true;
                        console.log(`  🔗 Successfully navigated to Faculty Requirements`);
                        await page.waitForTimeout(3000);
                        
                        // Test requirements page
                        for (let i = 0; i < 8; i++) {
                            try {
                                testResults.totalActions++;
                                testResults.facultyFeatures.requirements.actions++;
                                
                                const reqElements = await page.$$('button:not(:has-text("Sign Out")):not(:has-text("Logout")), .btn:not(:has-text("Sign Out")), .requirement-item, .upload-btn');
                                if (reqElements.length > 0) {
                                    const randomElement = reqElements[Math.floor(Math.random() * reqElements.length)];
                                    await randomElement.click({ timeout: 2000 });
                                    testResults.clickTests++;
                                    console.log(`    🖱️ Requirements - Action #${i + 1}`);
                                }
                                await page.waitForTimeout(400);
                            } catch (reqError) {
                                testResults.totalErrors++;
                                testResults.facultyFeatures.requirements.errors++;
                                console.log(`    ⚠️ Requirements Error #${i}: ${reqError.message}`);
                            }
                        }
                        break;
                    }
                } catch (reqNavError) {
                    continue;
                }
            }
        } catch (reqError) {
            console.log(`❌ Requirements navigation error: ${reqError.message}`);
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
    console.log("📊 SAFE FACULTY PORTAL MONKEY TEST RESULTS");
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

    console.log("✅ Safe Faculty Portal Monkey testing finished");
    
    // Keep browser open for 5 seconds to see final state
    await page.waitForTimeout(5000);
    await browser.close();
})();