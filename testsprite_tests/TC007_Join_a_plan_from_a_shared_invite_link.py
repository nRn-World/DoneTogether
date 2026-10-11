import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'TEST LOGIN' button to sign in using the test account.
        # Test Login button
        elem = page.get_by_test_id('test-login')
        await elem.click(timeout=10000)
        
        # -> Dismiss the 'Allow location & notifications' modal by clicking the 'LATER' button so the main UI can be accessed.
        # Later button
        elem = page.get_by_role('button', name='Later', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the join/invite interface by clicking the 'Join plan' button.
        # Join plan button
        elem = page.get_by_role('button', name='Join plan', exact=True)
        await elem.click(timeout=10000)
        
        # -> Paste a shared invite link into the 'Paste an invite link or code' input and click the 'Join now' button.
        # E.g. https://.../join/ABC123 text field
        elem = page.get_by_placeholder('E.g. https://.../join/ABC123', exact=True)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("https://localhost:5173/join/ABC123")
        
        # -> Paste a shared invite link into the 'Paste an invite link or code' input and click the 'Join now' button.
        # Join now button
        elem = page.get_by_role('button', name='Join now', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The app should open the shared plan after joining the invitation.
        # Assert-outcome: failed
        # Assert: Expected the 'Join now' button to be hidden after a successful join (the join modal should close when a plan opens).
        await expect(page.locator("xpath=/html/body/div[1]/div/div/div/div[2]/button").nth(0)).not_to_be_visible(timeout=15000), "Expected the 'Join now' button to be hidden after a successful join (the join modal should close when a plan opens)."
        
        # --> The invite input contains the pasted invitation link used to attempt joining.
        # Assert-outcome: failed
        # Assert: Expected the invite input to contain the pasted invitation link.
        await expect(page.locator("xpath=/html/body/div[1]/div/div/div/div[2]/div[1]/input").nth(0)).to_have_value("https://localhost:5173/join/ABC123", timeout=15000), "Expected the invite input to contain the pasted invitation link."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    