const { chromium } = require("playwright");

(async () => {

    // =========================
    // 1. OPEN BROWSER
    // =========================
    const browser = await chromium.launch({
        headless: false // para makita mo ginagawa
    });

    const page = await browser.newPage();

    // =========================
    // 2. OPEN WEBSITE
    // =========================
    await page.goto("http://localhost:7283");

    console.log("🚀 Monkey test started...");

    // =========================
    // 3. ERROR DETECTION
    // =========================

    // console errors sa browser
    page.on("console", msg => {
        if (msg.type() === "error") {
            console.log("❌ Console Error:", msg.text());
        }
    });

    // page crash errors
    page.on("pageerror", err => {
        console.log("💥 Page Error:", err.message);
    });

    // =========================
    // 4. MONKEY LOOP
    // =========================

    for (let i = 0; i < 200; i++) {

        try {

            // get all clickable + input elements
            const elements = await page.$$(
                "button, a, input, textarea, select"
            );

            if (elements.length === 0) continue;

            // pick random element
            const randomElement =
                elements[Math.floor(Math.random() * elements.length)];

            // check type ng element
            const tagName = await randomElement.evaluate(
                el => el.tagName
            );

            // =========================
            // 5. RANDOM ACTIONS
            // =========================

            // IF INPUT FIELD
            if (tagName === "INPUT" || tagName === "TEXTAREA") {

                await randomElement.fill("monkey123");

                console.log(`⌨️ Typing action #${i}`);

            } else {

                await randomElement.click({
                    timeout: 1500
                });

                console.log(`🖱️ Click action #${i}`);
            }

            // =========================
            // 6. RANDOM DELAY
            // =========================
            await page.waitForTimeout(300);

            // =========================
            // 7. RANDOM SCROLL (optional realism)
            // =========================
            await page.mouse.wheel(0, 300);

        } catch (error) {

            // =========================
            // 8. HANDLE ERRORS
            // =========================
            console.log("⚠️ Action Error:", error.message);
        }
    }

    console.log("✅ Monkey testing finished");

    await browser.close();

})();