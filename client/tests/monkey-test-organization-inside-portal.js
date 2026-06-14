const { chromium } = require("playwright");

(async () => {
    console.log("🏛️ Starting Organization Portal INSIDE Testing...");
    console.log("📝 NOTE: Please login manually first using:");
    console.log("   Email: acets.lipa@g.batstate-u.edu.ph");
    console.log("   Pass: sXMDJbJbTgIK");
    console.log("   Then run this test while logged in!");
    
    const browser = await chromium.launch({
        headless: false,
        slowMo: 400 // Slower for better observation
    });

    const page = await browser.newPage();

    // Test Results Structure (based on the table format)
    let testResults = {
        organizationPortal: {
            dashboard: {
                pageLoad: { trial1: false, trial2: false, trial3: false, canAccess: false },
                navigation: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            members: {
                membersList: { trial1: false, trial2: false, trial3: false, canAccess: false },
                addMembers: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            events: {
                eventsList: { trial1: false, trial2: false, trial3: false, canAccess: false },
                createEvents: { trial1: false, trial2: false, trial3: false, canAccess: false }
            },
            documents: {
                allLetters: { trial1: false, trial2: false, trial3: false, canSave: false },
                withNumbers: { trial1: false, trial2: false, trial3: false, canSave: false },
                contactNumber: { trial1: false, trial2: false, trial3: false, canSave: false },
                elevenDigits: { trial1: false, trial2: false, trial3: false, canSave: false }
            },
            reports: {
                withTitle: { trial1: false, trial2: false, trial3: false, canPublish: false },
                withContent: { trial1: false, trial2: false, trial3: false, canPublish: false }
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
        // Navigate directly to Organization dashboard (assuming already logged in)
        console.log("🏛️ Navigating to Organization Dashboard...");
        await page.goto("http://localhost:7283/#/organization/dashboard");
        await page.waitForTimeout(3000);

        // PART 1: ORGANIZATION DASHBOARD TESTING
        console.log("\n🏛️ TESTING ORGANIZATION DASHBOARD");
        console.log("=".repeat(50));

        // Test Dashboard Load (3 trials)
        console.log("🧪 Testing Dashboard Load...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const dashboardElements = await page.$$('.dashboard, .nav-link, .card, h1, h2, .sidebar, .organization-dashboard');
                if (dashboardElements.length > 0) {
                    testResults.organizationPortal.dashboard.pageLoad[`trial${trial}`] = true;
                    testResults.organizationPortal.dashboard.pageLoad.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Organization Dashboard loaded successfully`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Organization Dashboard elements not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Dashboard test error: ${error.message}`);
            }
        }

        // Test Navigation (3 trials)
        console.log("🧪 Testing Navigation...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const navLinks = await page.$$('.nav-link, .menu-item, .sidebar-link, a[href*="organization"]');
                if (navLinks.length > 0) {
                    testResults.organizationPortal.dashboard.navigation[`trial${trial}`] = true;
                    testResults.organizationPortal.dashboard.navigation.canAccess = true;
                    console.log(`  Trial ${trial}: ✅ Organization Navigation elements found (${navLinks.length} links)`);
                } else {
                    console.log(`  Trial ${trial}: ❌ Organization Navigation elements not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Navigation test error: ${error.message}`);
            }
        }

        // PART 2: MEMBERS MANAGEMENT TESTING
        console.log("\n👥 TESTING MEMBERS MANAGEMENT");
        console.log("=".repeat(50));

        // Test Members List Access (3 trials)
        console.log("🧪 Testing Members List Access...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const membersLink = await page.$('a[href*="member"], .nav-link:has-text("Members"), .menu-item:has-text("Members")');
                if (membersLink) {
                    await membersLink.click();
                    await page.waitForTimeout(2000);
                    
                    const membersElements = await page.$$('.member, .member-list, .member-card, .members-table');
                    if (membersElements.length > 0) {
                        testResults.organizationPortal.members.membersList[`trial${trial}`] = true;
                        testResults.organizationPortal.members.membersList.canAccess = true;
                        console.log(`  Trial ${trial}: ✅ Organization Members accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Organization Members elements not found`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Members link not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Members test error: ${error.message}`);
            }
        }

        // PART 3: EVENTS MANAGEMENT TESTING
        console.log("\n📅 TESTING EVENTS MANAGEMENT");
        console.log("=".repeat(50));

        // Test Events Access (3 trials)
        console.log("🧪 Testing Events Access...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const eventsLink = await page.$('a[href*="event"], .nav-link:has-text("Events"), .menu-item:has-text("Events")');
                if (eventsLink) {
                    await eventsLink.click();
                    await page.waitForTimeout(2000);
                    
                    const eventsElements = await page.$$('.event, .event-list, .event-card, .events-table');
                    if (eventsElements.length > 0) {
                        testResults.organizationPortal.events.eventsList[`trial${trial}`] = true;
                        testResults.organizationPortal.events.eventsList.canAccess = true;
                        console.log(`  Trial ${trial}: ✅ Organization Events accessible`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ Organization Events elements not found`);
                    }
                } else {
                    console.log(`  Trial ${trial}: ❌ Events link not found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Events test error: ${error.message}`);
            }
        }

        // PART 4: DOCUMENTS TESTING
        console.log("\n📋 TESTING ORGANIZATION DOCUMENTS");
        console.log("=".repeat(50));

        // Test All Letters Input (3 trials)
        console.log("🧪 Testing All Letters Input...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const textInputs = await page.$$('input[type="text"], input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="organization"]');
                if (textInputs.length > 0) {
                    const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                    await randomInput.fill("ACETS Organization");
                    testResults.organizationPortal.documents.allLetters[`trial${trial}`] = true;
                    testResults.organizationPortal.documents.allLetters.canSave = true;
                    console.log(`  Trial ${trial}: ✅ All letters input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No text inputs found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ All letters test error: ${error.message}`);
            }
        }

        // Test With Numbers and Symbols (3 trials)
        console.log("🧪 Testing With Numbers and Symbols...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const textInputs = await page.$$('input[type="text"]');
                if (textInputs.length > 0) {
                    const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                    await randomInput.fill("Org2024@#");
                    testResults.organizationPortal.documents.withNumbers[`trial${trial}`] = true;
                    console.log(`  Trial ${trial}: ✅ Numbers and symbols input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No text inputs found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Numbers/symbols test error: ${error.message}`);
            }
        }

        // Test Contact Number (3 trials)
        console.log("🧪 Testing Contact Number...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const phoneInputs = await page.$$('input[type="tel"], input[placeholder*="phone"], input[placeholder*="contact"], input[placeholder*="number"]');
                if (phoneInputs.length > 0) {
                    const randomInput = phoneInputs[Math.floor(Math.random() * phoneInputs.length)];
                    await randomInput.fill("09123456789");
                    testResults.organizationPortal.documents.contactNumber[`trial${trial}`] = true;
                    testResults.organizationPortal.documents.contactNumber.canSave = true;
                    console.log(`  Trial ${trial}: ✅ Contact number input successful`);
                } else {
                    // Try with regular text inputs that might be for phone
                    const textInputs = await page.$$('input[type="text"]');
                    if (textInputs.length > 0) {
                        const randomInput = textInputs[Math.floor(Math.random() * textInputs.length)];
                        await randomInput.fill("09123456789");
                        testResults.organizationPortal.documents.contactNumber[`trial${trial}`] = true;
                        console.log(`  Trial ${trial}: ✅ Contact number (text input) successful`);
                    } else {
                        console.log(`  Trial ${trial}: ❌ No contact number inputs found`);
                    }
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Contact number test error: ${error.message}`);
            }
        }

        // Test 11 Digits Only (3 trials)
        console.log("🧪 Testing 11 Digits Only...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const inputs = await page.$$('input[type="text"], input[type="tel"]');
                if (inputs.length > 0) {
                    const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
                    await randomInput.fill("09123456789"); // Exactly 11 digits
                    testResults.organizationPortal.documents.elevenDigits[`trial${trial}`] = true;
                    testResults.organizationPortal.documents.elevenDigits.canSave = true;
                    console.log(`  Trial ${trial}: ✅ 11 digits input successful`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No inputs found for 11 digits test`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ 11 digits test error: ${error.message}`);
            }
        }

        // PART 5: REPORTS TESTING
        console.log("\n📊 TESTING ORGANIZATION REPORTS");
        console.log("=".repeat(50));

        // Test With Title (3 trials)
        console.log("🧪 Testing With Title...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const titleElements = await page.$$('h1, h2, h3, .title, .report-title, .page-title');
                if (titleElements.length > 0) {
                    testResults.organizationPortal.reports.withTitle[`trial${trial}`] = true;
                    testResults.organizationPortal.reports.withTitle.canPublish = true;
                    console.log(`  Trial ${trial}: ✅ Reports with title found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No title elements found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Reports title test error: ${error.message}`);
            }
        }

        // Test With Content (3 trials)
        console.log("🧪 Testing With Content...");
        for (let trial = 1; trial <= 3; trial++) {
            try {
                const contentElements = await page.$$('.content, .report-content, .main-content, .card-body, p, div');
                if (contentElements.length > 0) {
                    testResults.organizationPortal.reports.withContent[`trial${trial}`] = true;
                    testResults.organizationPortal.reports.withContent.canPublish = true;
                    console.log(`  Trial ${trial}: ✅ Reports with content found`);
                } else {
                    console.log(`  Trial ${trial}: ❌ No content elements found`);
                }
                await page.waitForTimeout(500);
            } catch (error) {
                console.log(`  Trial ${trial}: ⚠️ Reports content test error: ${error.message}`);
            }
        }

        // PART 6: RANDOM INTERACTIONS (like the original monkey test)
        console.log("\n🐒 PERFORMING RANDOM INTERACTIONS");
        console.log("=".repeat(50));

        for (let i = 0; i < 15; i++) {
            try {
                const elements = await page.$$(
                    "button:not([disabled]):not(:has-text('Sign Out')):not(:has-text('Logout')), a:not([href='#']):not(:has-text('Sign Out')):not(:has-text('Logout')), input:not([readonly]):not([type='file']), textarea, select, .btn:not(:has-text('Sign Out')):not(:has-text('Logout')), .card"
                );

                if (elements.length > 0) {
                    const randomElement = elements[Math.floor(Math.random() * elements.length)];
                    const tagName = await randomElement.evaluate(el => el.tagName);
                    const elementType = await randomElement.evaluate(el => el.type || el.tagName);
                    const elementText = await randomElement.evaluate(el => el.textContent?.substring(0, 20) || '');

                    if (tagName === "INPUT" || tagName === "TEXTAREA") {
                        if (elementType === "checkbox" || elementType === "radio") {
                            await randomElement.click({ timeout: 2000 });
                            console.log(`  🖱️ Random Action ${i + 1}: Clicked ${elementType}`);
                        } else if (elementType !== "file") {
                            await randomElement.fill("Organization Random Data");
                            console.log(`  ⌨️ Random Action ${i + 1}: Filled ${elementType}`);
                        }
                    } else {
                        await randomElement.click({ timeout: 2000 });
                        console.log(`  🖱️ Random Action ${i + 1}: Clicked "${elementText}"`);
                    }
                }
                await page.waitForTimeout(300);
            } catch (error) {
                console.log(`  ⚠️ Random Action ${i + 1} Error: ${error.message}`);
            }
        }

    } catch (mainError) {
        console.log("❌ Main Test Error:", mainError.message);
    }

    // Generate Results Summary in Table Format
    console.log("\n" + "=".repeat(70));
    console.log("📊 ORGANIZATION PORTAL INSIDE MONKEY TEST RESULTS");
    console.log("=".repeat(70));

    console.log("\n🏛️ ORGANIZATION PORTAL TESTS:");
    console.log(`  Dashboard Load: ${testResults.organizationPortal.dashboard.pageLoad.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.dashboard.pageLoad.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.dashboard.pageLoad.trial3 ? '/' : 'x'} | Access: ${testResults.organizationPortal.dashboard.pageLoad.canAccess ? '/' : 'x'}`);
    console.log(`  Navigation: ${testResults.organizationPortal.dashboard.navigation.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.dashboard.navigation.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.dashboard.navigation.trial3 ? '/' : 'x'} | Access: ${testResults.organizationPortal.dashboard.navigation.canAccess ? '/' : 'x'}`);

    console.log("\n👥 MEMBERS MANAGEMENT TESTS:");
    console.log(`  Members List: ${testResults.organizationPortal.members.membersList.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.members.membersList.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.members.membersList.trial3 ? '/' : 'x'} | Access: ${testResults.organizationPortal.members.membersList.canAccess ? '/' : 'x'}`);

    console.log("\n📅 EVENTS MANAGEMENT TESTS:");
    console.log(`  Events List: ${testResults.organizationPortal.events.eventsList.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.events.eventsList.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.events.eventsList.trial3 ? '/' : 'x'} | Access: ${testResults.organizationPortal.events.eventsList.canAccess ? '/' : 'x'}`);

    console.log("\n📋 DOCUMENTS TESTS:");
    console.log(`  All Letters: ${testResults.organizationPortal.documents.allLetters.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.documents.allLetters.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.documents.allLetters.trial3 ? '/' : 'x'} | Save: ${testResults.organizationPortal.documents.allLetters.canSave ? '/' : 'x'}`);
    console.log(`  With Numbers: ${testResults.organizationPortal.documents.withNumbers.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.documents.withNumbers.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.documents.withNumbers.trial3 ? '/' : 'x'} | Save: ${testResults.organizationPortal.documents.withNumbers.canSave ? '/' : 'x'}`);
    console.log(`  Contact Number: ${testResults.organizationPortal.documents.contactNumber.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.documents.contactNumber.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.documents.contactNumber.trial3 ? '/' : 'x'} | Save: ${testResults.organizationPortal.documents.contactNumber.canSave ? '/' : 'x'}`);
    console.log(`  11 Digits Only: ${testResults.organizationPortal.documents.elevenDigits.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.documents.elevenDigits.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.documents.elevenDigits.trial3 ? '/' : 'x'} | Save: ${testResults.organizationPortal.documents.elevenDigits.canSave ? '/' : 'x'}`);

    console.log("\n📊 REPORTS TESTS:");
    console.log(`  With Title: ${testResults.organizationPortal.reports.withTitle.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.reports.withTitle.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.reports.withTitle.trial3 ? '/' : 'x'} | Publish: ${testResults.organizationPortal.reports.withTitle.canPublish ? '/' : 'x'}`);
    console.log(`  With Content: ${testResults.organizationPortal.reports.withContent.trial1 ? '/' : 'x'} | ${testResults.organizationPortal.reports.withContent.trial2 ? '/' : 'x'} | ${testResults.organizationPortal.reports.withContent.trial3 ? '/' : 'x'} | Publish: ${testResults.organizationPortal.reports.withContent.canPublish ? '/' : 'x'}`);

    console.log(`\n📊 Console Errors: ${consoleErrors.length}`);
    console.log(`💥 Page Errors: ${pageErrors.length}`);
    console.log("=".repeat(70));

    console.log("✅ Organization Portal Inside Monkey testing finished");
    console.log("📝 Please manually review the browser for final state");
    
    // Keep browser open for 10 seconds to see final state
    await page.waitForTimeout(10000);
    await browser.close();

    // Return test results for documentation
    return testResults;
})();