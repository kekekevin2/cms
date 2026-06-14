const { chromium } = require("playwright");

(async () => {
    console.log("🏛️ Starting Organization Portal Monkey Test...");
    
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
        // Login as Organization
        console.log("🔐 Logging in as Organization...");
        await page.fill('input[type="email"]', 'org@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForTimeout(2000);
        
        console.log("🎯 Organization Dashboard loaded, starting monkey test...");

        // Organization-specific monkey testing
        for (let i = 0; i < 150; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]), a, input:not([readonly]), textarea, select, .card, .list-item"
                );

                if (elements.length === 0) continue;

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);

                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 1500 });
                        console.log(`☑️ Organization Portal - Checkbox/Radio action #${i}`);
                    } else if (elementType === "file") {
                        console.log(`📁 Organization Portal - File input skipped #${i}`);
                    } else {
                        await randomElement.fill("org_test_data");
                        console.log(`⌨️ Organization Portal - Input action #${i}`);
                    }
                } else {
                    await randomElement.click({ timeout: 1500 });
                    console.log(`🖱️ Organization Portal - Click action #${i}`);
                }

                await page.waitForTimeout(300);
                
                // Random scroll for organization content
                if (Math.random() > 0.75) {
                    await page.mouse.wheel(0, Math.random() * 350 - 175);
                }

            } catch (error) {
                console.log(`⚠️ Organization Portal Action Error #${i}:`, error.message);
            }
        }

    } catch (loginError) {
        console.log("❌ Organization Login Error:", loginError.message);
    }

    console.log("✅ Organization Portal Monkey testing finished");
    await browser.close();
})();