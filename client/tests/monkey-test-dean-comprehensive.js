const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting Comprehensive Dean Portal Monkey Test...");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 100 // Slow down for better observation
    });

    const page = await browser.newPage();

    // Error detection
    page.on("console", msg => {
        if (msg.type() === "error") {
            console.log("❌ Console Error:", msg.text());
        }
    });

    page.on("pageerror", err => {
        console.log("💥 Page Error:", err.message);
    });

    let testResults = {
        loginSuccess: false,
        dashboardAccess: false,
        navigationTests: 0,
        inputTests: 0,
        clickTests: 0,
        errors: 0,
        totalActions: 0
    };

    try {
        // Navigate to login page
        await page.goto("http://localhost:7283");
        console.log("📱 Navigated to login page");

        // Login as Dean with correct credentials
        console.log("🔐 Attempting Dean login...");
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.fill('input[type="email"]', 'cit.lipa@g.batstate-u.edu.ph');
        await page.fill('input[type="password"]', '#B$E4dih^Bj5');
        await page.click('button[type="submit"]');
        
        // Wait for login to complete and dashboard to load
        console.log("⏳ Waiting for Dean dashboard to load...");
        await page.waitForTimeout(3000);
        
        // Check if we're successfully logged in (look for dean-specific elements)
        const isDeanDashboard = await page.$('.dean-dashboard, .dashboard-container, h1, h2, .nav-link');
        if (isDeanDashboard) {
            testResults.loginSuccess = true;
            testResults.dashboardAccess = true;
            console.log("✅ Successfully logged into Dean portal!");
        } else {
            console.log("❌ Login may have failed - dashboard not detected");
        }

        // Dean Portal Specific Testing
        console.log("🏠 Starting Dean portal monkey testing...");

        for (let i = 0; i < 100; i++) {
            try {
                testResults.totalActions++;

                // Get all interactive elements
                const elements = await page.$$(
                    "button:not([disabled]), a:not([href='#']), input:not([readonly]), textarea, select, .btn, .nav-link, .card-clickable, .list-item"
                );

                if (elements.length === 0) {
                    console.log(`⚠️ No interactive elements found at action #${i}`);
                    continue;
                }

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                const elementClass = await randomElement.evaluate(el => el.className);

                // Test different types of interactions
                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 2000 });
                        testResults.clickTests++;
                        console.log(`☑️ Dean Portal - Checkbox/Radio clicked #${i} (${elementClass})`);
                    } else if (elementType === "file") {
                        console.log(`📁 Dean Portal - File input skipped #${i}`);
                    } else {
                        await randomElement.fill("Dean Test Data 123");
                        testResults.inputTests++;
                        console.log(`⌨️ Dean Portal - Input filled #${i} (${elementType})`);
                    }
                } else if (tagName === "A") {
                    // Test navigation links
                    const href = await randomElement.evaluate(el => el.href);
                    if (href && !href.includes('#') && !href.includes('javascript:')) {
                        await randomElement.click({ timeout: 2000 });
                        testResults.navigationTests++;
                        console.log(`🔗 Dean Portal - Navigation link clicked #${i}`);
                        await page.waitForTimeout(1000); // Wait for page load
                    }
                } else {
                    // Test buttons and other clickable elements
                    await randomElement.click({ timeout: 2000 });
                    testResults.clickTests++;
                    console.log(`🖱️ Dean Portal - Button/Element clicked #${i} (${tagName})`);
                }

                // Random wait between actions
                await page.waitForTimeout(Math.random() * 500 + 200);
                
                // Random scroll to simulate user behavior
                if (Math.random() > 0.7) {
                    await page.mouse.wheel(0, Math.random() * 400 - 200);
                }

                // Check for any modal dialogs or alerts and handle them
                try {
                    const modal = await page.$('.modal, .alert, .popup');
                    if (modal) {
                        const closeBtn = await page.$('.modal .close, .alert .close, .btn-close');
                        if (closeBtn) {
                            await closeBtn.click();
                            console.log(`🔄 Closed modal/alert at action #${i}`);
                        }
                    }
                } catch (modalError) {
                    // Ignore modal handling errors
                }

            } catch (error) {
                testResults.errors++;
                console.log(`⚠️ Dean Portal Action Error #${i}: ${error.message}`);
            }
        }

    } catch (loginError) {
        console.log("❌ Dean Login/Setup Error:", loginError.message);
        testResults.errors++;
    }

    // Print test summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 DEAN PORTAL MONKEY TEST SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Login Success: ${testResults.loginSuccess}`);
    console.log(`🏠 Dashboard Access: ${testResults.dashboardAccess}`);
    console.log(`🔗 Navigation Tests: ${testResults.navigationTests}`);
    console.log(`⌨️ Input Tests: ${testResults.inputTests}`);
    console.log(`🖱️ Click Tests: ${testResults.clickTests}`);
    console.log(`⚠️ Errors: ${testResults.errors}`);
    console.log(`📈 Total Actions: ${testResults.totalActions}`);
    console.log(`📊 Success Rate: ${((testResults.totalActions - testResults.errors) / testResults.totalActions * 100).toFixed(1)}%`);
    console.log("=".repeat(50));

    console.log("✅ Dean Portal Comprehensive Monkey testing finished");
    await browser.close();
})();