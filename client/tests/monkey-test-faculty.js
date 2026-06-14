const { chromium } = require("playwright");

(async () => {
    console.log("👨‍🏫 Starting Faculty Portal Monkey Test...");
    
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    // Navigate to login page
    await page.goto("http://localhost:7283");

    // Error detection
    page.on("console", msg => {
        if (msg.type() === "error") {
            console.log("❌ Console Error:", msg.text());
        }
    });

    page.on("pageerror", err => {
        console.log("💥 Page Error:", err.message);
    });

    try {
        // Login as Faculty
        console.log("🔐 Logging in as Faculty...");
        await page.fill('input[type="email"]', 'faculty@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForTimeout(2000);
        
        console.log("📚 Faculty Dashboard loaded, starting monkey test...");

        // Faculty-specific monkey testing
        for (let i = 0; i < 150; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]), a, input:not([readonly]), textarea, select, .btn, .nav-link"
                );

                if (elements.length === 0) continue;

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);

                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 1500 });
                        console.log(`☑️ Faculty Portal - Checkbox/Radio action #${i}`);
                    } else if (elementType === "file") {
                        console.log(`📁 Faculty Portal - File input skipped #${i}`);
                    } else {
                        await randomElement.fill("faculty_test_input");
                        console.log(`⌨️ Faculty Portal - Input action #${i}`);
                    }
                } else {
                    await randomElement.click({ timeout: 1500 });
                    console.log(`🖱️ Faculty Portal - Click action #${i}`);
                }

                await page.waitForTimeout(250);
                
                // Random navigation simulation
                if (Math.random() > 0.8) {
                    await page.mouse.wheel(0, Math.random() * 300 - 150);
                }

            } catch (error) {
                console.log(`⚠️ Faculty Portal Action Error #${i}:`, error.message);
            }
        }

    } catch (loginError) {
        console.log("❌ Faculty Login Error:", loginError.message);
    }

    console.log("✅ Faculty Portal Monkey testing finished");
    await browser.close();
})();