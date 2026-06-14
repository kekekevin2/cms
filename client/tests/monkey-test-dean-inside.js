const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting Dean Portal INSIDE Monkey Test...");
    console.log("📝 NOTE: Please login manually first, then run this test!");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 200 // Slower for better observation
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
        dashboardTests: 0,
        facultyManagementTests: 0,
        organizationTests: 0,
        profileTests: 0,
        analyticsTests: 0,
        navigationTests: 0,
        inputTests: 0,
        clickTests: 0,
        formSubmissions: 0,
        errors: 0,
        totalActions: 0,
        testedFeatures: []
    };

    try {
        // Navigate directly to Dean dashboard (assuming already logged in)
        await page.goto("http://localhost:7283/#/dean/dashboard");
        console.log("🏠 Navigated to Dean Dashboard");
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        console.log("🚀 Starting Dean Portal Feature Testing...");

        // Test Dean-specific features
        const deanFeatures = [
            { url: "/#/dean/dashboard", name: "Dashboard", category: "dashboard" },
            { url: "/#/dean/faculty", name: "Faculty Management", category: "faculty" },
            { url: "/#/dean/organizations", name: "Organization Management", category: "organization" },
            { url: "/#/dean/my-profile", name: "Dean Profile", category: "profile" },
            { url: "/#/dean/analytics", name: "Analytics", category: "analytics" },
            { url: "/#/dean/faculty-analytics", name: "Faculty Analytics", category: "analytics" },
            { url: "/#/dean/organization-dashboard", name: "Organization Dashboard", category: "organization" }
        ];

        // Test each Dean feature
        for (let feature of deanFeatures) {
            try {
                console.log(`\n🔍 Testing ${feature.name}...`);
                await page.goto(`http://localhost:7283${feature.url}`);
                await page.waitForTimeout(2000);
                
                testResults.testedFeatures.push(feature.name);
                
                // Perform random actions on this page
                for (let i = 0; i < 15; i++) {
                    try {
                        testResults.totalActions++;

                        const elements = await page.$$(
                            "button:not([disabled]), a:not([href='#']), input:not([readonly]), textarea, select, .btn, .nav-link, .card, .table-row, .dropdown-toggle"
                        );

                        if (elements.length === 0) {
                            console.log(`⚠️ No interactive elements found in ${feature.name}`);
                            continue;
                        }

                        const randomElement = elements[Math.floor(Math.random() * elements.length)];
                        const tagName = await randomElement.evaluate(el => el.tagName);
                        const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                        const elementText = await randomElement.evaluate(el => el.textContent?.substring(0, 30) || '');

                        if (tagName === "INPUT" || tagName === "TEXTAREA") {
                            if (elementType === "checkbox" || elementType === "radio") {
                                await randomElement.click({ timeout: 2000 });
                                testResults.clickTests++;
                                console.log(`  ☑️ Clicked ${elementType} in ${feature.name}`);
                            } else if (elementType === "file") {
                                console.log(`  📁 Skipped file input in ${feature.name}`);
                            } else {
                                await randomElement.fill("Test Data 123");
                                testResults.inputTests++;
                                console.log(`  ⌨️ Filled ${elementType} in ${feature.name}`);
                            }
                        } else if (tagName === "SELECT") {
                            const options = await randomElement.$$('option');
                            if (options.length > 1) {
                                await randomElement.selectOption({ index: 1 });
                                testResults.inputTests++;
                                console.log(`  📋 Selected option in ${feature.name}`);
                            }
                        } else {
                            await randomElement.click({ timeout: 2000 });
                            testResults.clickTests++;
                            console.log(`  🖱️ Clicked "${elementText}" in ${feature.name}`);
                        }

                        // Update category counters
                        switch (feature.category) {
                            case "dashboard": testResults.dashboardTests++; break;
                            case "faculty": testResults.facultyManagementTests++; break;
                            case "organization": testResults.organizationTests++; break;
                            case "profile": testResults.profileTests++; break;
                            case "analytics": testResults.analyticsTests++; break;
                        }

                        await page.waitForTimeout(300);

                    } catch (error) {
                        testResults.errors++;
                        console.log(`  ⚠️ Error in ${feature.name}: ${error.message}`);
                    }
                }
                
            } catch (featureError) {
                testResults.errors++;
                console.log(`❌ Failed to test ${feature.name}: ${featureError.message}`);
            }
        }

        // Test navigation between features
        console.log("\n🔄 Testing Navigation...");
        for (let i = 0; i < 10; i++) {
            try {
                const navLinks = await page.$$('.nav-link, .sidebar-link, .menu-item');
                if (navLinks.length > 0) {
                    const randomNav = navLinks[Math.floor(Math.random() * navLinks.length)];
                    await randomNav.click({ timeout: 2000 });
                    testResults.navigationTests++;
                    console.log(`  🔗 Navigation test #${i + 1}`);
                    await page.waitForTimeout(1000);
                }
            } catch (navError) {
                testResults.errors++;
                console.log(`  ⚠️ Navigation error #${i + 1}: ${navError.message}`);
            }
        }

    } catch (mainError) {
        console.log("❌ Main Test Error:", mainError.message);
        testResults.errors++;
    }

    // Generate comprehensive results
    const successRate = ((testResults.totalActions - testResults.errors) / testResults.totalActions * 100).toFixed(1);
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 DEAN PORTAL INSIDE MONKEY TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`🏠 Dashboard Tests: ${testResults.dashboardTests}`);
    console.log(`👨‍🏫 Faculty Management Tests: ${testResults.facultyManagementTests}`);
    console.log(`🏛️ Organization Tests: ${testResults.organizationTests}`);
    console.log(`👤 Profile Tests: ${testResults.profileTests}`);
    console.log(`📈 Analytics Tests: ${testResults.analyticsTests}`);
    console.log(`🔗 Navigation Tests: ${testResults.navigationTests}`);
    console.log(`⌨️ Input Tests: ${testResults.inputTests}`);
    console.log(`🖱️ Click Tests: ${testResults.clickTests}`);
    console.log(`⚠️ Errors: ${testResults.errors}`);
    console.log(`📊 Total Actions: ${testResults.totalActions}`);
    console.log(`✅ Success Rate: ${successRate}%`);
    console.log(`🎯 Features Tested: ${testResults.testedFeatures.join(', ')}`);
    console.log(`❌ Console Errors: ${consoleErrors.length}`);
    console.log(`💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(60));

    // Save results to file
    const resultsData = {
        timestamp: new Date().toISOString(),
        testResults,
        consoleErrors,
        pageErrors,
        successRate: parseFloat(successRate)
    };

    console.log("💾 Saving results to dean-monkey-test-results.json...");
    require('fs').writeFileSync(
        'dean-monkey-test-results.json', 
        JSON.stringify(resultsData, null, 2)
    );

    console.log("✅ Dean Portal Inside Monkey testing finished");
    await browser.close();
})();