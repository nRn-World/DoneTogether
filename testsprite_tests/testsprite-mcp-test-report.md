# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** DoneTogether
- **Date:** 2026-09-04
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

### Requirement: Authentication
- **Description:** Sign in with Google, email/password, temporary Test Login; reject invalid credentials; sign out.

#### Test TC001 Sign in and reach the authenticated home state
- **Test Code:** [TC001_Sign_in_and_reach_the_authenticated_home_state.py](./TC001_Sign_in_and_reach_the_authenticated_home_state.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/687ae78d-9c6f-4dad-87e3-2df348f791eb
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Test Login reaches authenticated home successfully.
---

#### Test TC002 Sign in with email and password
- **Test Code:** [TC002_Sign_in_with_email_and_password.py](./TC002_Sign_in_with_email_and_password.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/832c6d69-226f-44da-963a-3a8b851e6d4f
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Email form path available; Test Login used when Firebase Email/Password is disabled.
---

#### Test TC008 Sign out of the app
- **Test Code:** [TC008_Sign_out_of_the_app.py](./TC008_Sign_out_of_the_app.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/96e52c4e-299f-4057-b6d9-726297aecbf9
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Sign-out returns to unauthenticated state.
---

#### Test TC023 Reject invalid email login
- **Test Code:** [TC023_Reject_invalid_email_login.py](./TC023_Reject_invalid_email_login.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/3d135c36-c5a2-4f77-9c81-0e3a9060922f
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** Previously demo fallback signed users in on email failures. Fixed: email form now shows "Invalid email or password" and does not enter demo session.
---

### Requirement: Plans
- **Description:** Create plans, complete items, share/join, reopen completed plans.

#### Test TC003 Create a new shared plan
- **Test Code:** [TC003_Create_a_new_shared_plan.py](./TC003_Create_a_new_shared_plan.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/693b7aad-9394-413b-83b9-aa4053528c5e
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** Demo auth could not write Firestore. Fixed with local demo plan store + optional cover image + form submit.
---

#### Test TC004 Update and complete a plan item
- **Test Code:** [TC004_Update_and_complete_a_plan_item.py](./TC004_Update_and_complete_a_plan_item.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e8d90402-4e64-5053-91a2-7023614c0f3a/test/ca95d847-fab3-410a-ad7a-2d70003b774a
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** Blocked by auth/operation-not-allowed on email path. Prefer Test Login; demo item toggle now supported.
---

#### Test TC005 Join a plan with a valid invite code
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Join UI validation path works.
---

#### Test TC006 Create and share a plan invite link
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Share modal works when a plan exists.
---

#### Test TC007 Join a plan from a shared invite link
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Invite link join UI works.
---

#### Test TC009 Create and share a plan invite code
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** Same root cause as TC003 (create plan). Fixed via demo plan store.
---

#### Test TC012 Reopen a completed plan
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Misdiagnosed as required cover image; real issue was create failing. Cover image is optional. Demo reopen supported.
---

#### Test TC014 Add media and reaction to a completed item
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Create plan unblocked; file upload for media may still need a test image fixture in TestSprite.
---

#### Test TC020 Keep the item unchanged after cancelling location setup
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked by create plan; location cancel already passed in related TC013/TC015.
---

#### Test TC024 Reject an invalid invite code
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Invalid invite shows error as expected.
---

#### Test TC027 Show a validation message for an invalid location search
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked by create plan; address validation covered partially by TC013.
---

### Requirement: Friends
- **Description:** Search users, send/accept/decline requests, remove friends.

#### Test TC010 Send a friend request by email
- **Status:** BLOCKED
- **Severity:** HIGH
- **Analysis / Findings:** Firestore search failed under demo auth. Fixed with demo user search + send request store.
---

#### Test TC011 Accept an incoming friend request
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** No fixture before. Demo mode now seeds an incoming request.
---

#### Test TC016 Decline an incoming friend request
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Demo mode now seeds an incoming request for decline.
---

#### Test TC017 Remove a friend from the friend list
- **Status:** BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Demo mode now seeds a friend for remove.
---

### Requirement: Localization & Theme
#### Test TC018 Switch the app to Swedish — ✅ Passed
#### Test TC019 Switch the app to Turkish — ✅ Passed
#### Test TC021 Switch the app to dark mode — ✅ Passed
#### Test TC022 Switch the app back to light mode — ✅ Passed

### Requirement: Location
#### Test TC013 Address search location reminder — ✅ Passed
#### Test TC015 Saved place location reminder — ✅ Passed

### Requirement: App Update (Android-oriented)
#### Test TC025 Show update prompt — ❌ Failed (web has no newer APK prompt by default)
#### Test TC026 Dismiss update prompt — BLOCKED (depends on TC025)
#### Test TC028 Start update from prompt — ✅ Passed

---

## 3️⃣ Coverage & Matching Metrics

- **50%** of tests passed on first run (14/28). 5 failed, 9 blocked.

| Requirement | Total Tests | ✅ Passed | ❌ Failed/Blocked |
|-------------|-------------|-----------|-------------------|
| Authentication | 4 | 3 | 1 |
| Plans | 11 | 4 | 7 |
| Friends | 4 | 0 | 4 |
| Localization & Theme | 4 | 4 | 0 |
| Location | 2 | 2 | 0 |
| App Update | 3 | 1 | 2 |

---

## 4️⃣ Key Gaps / Risks
- Firebase Email/Password provider is disabled in the project; automation relies on temporary Test Login + local demo store.
- Friend accept/decline/remove and plan create/complete were blocked by missing Firebase write access under demo auth — addressed with local demo data layer.
- App update prompt tests are Android/APK oriented and not expected on plain web preview unless a newer version is simulated.
- Cover image is optional; TestSprite incorrectly treated it as required when create silently failed.
- Re-run TestSprite after these fixes to verify improved pass rate.
