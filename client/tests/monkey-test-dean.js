const { chromium } = require("playwright");

(async () => {
    console.log("🎯 Starting Dean Portal Monkey Test...");
    
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
        // Login as Dean
        console.log("🔐 Logging in as Dean...");
        await page.fill('input[type="email"]', 'cit.lipa@g.batstate-u.edu.ph');
        await page.fill('input[type="password"]', '#B$E4dih^Bj5');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForTimeout(2000);
        
        console.log("🏠 Dean Dashboard loaded, starting monkey test...");

        // Dean-specific monkey testing
        for (let i = 0; i < 150; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]), a, input:not([readonly]), textarea, select, .clickable"
                );

                if (elements.length === 0) continue;

                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const tagName = await randomElement.evaluate(el => el.tagName);
                const elementType = await randomElement.evaluate(el => el.type || el.tagName);

                if (tagName === "INPUT" || tagName === "TEXTAREA") {
                    if (elementType === "checkbox" || elementType === "radio") {
                        await randomElement.click({ timeout: 1500 });
                        console.log(`☑️ Dean Portal - Checkbox/Radio action #${i}`);
                    } else {
                        await randomElement.fill("dean_test_data");
                        console.log(`⌨️ Dean Portal - Input action #${i}`);
                    }
                } else {
                    await randomElement.click({ timeout: 1500 });
                    console.log(`🖱️ Dean Portal - Click action #${i}`);
                }

                await page.waitForTimeout(200);
                
                // Random scroll
                if (Math.random() > 0.7) {
                    await page.mouse.wheel(0, Math.random() * 400 - 200);
                }

            } catch (error) {
                console.log(`⚠️ Dean Portal Action Error #${i}:`, error.message);
            }
        }

    } catch (loginError) {
        console.log("❌ Dean Login Error:", loginError.message);
    }

    console.log("✅ Dean Portal Monkey testing finished");
    await browser.close();
})();