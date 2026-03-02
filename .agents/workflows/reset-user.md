---
description: Reset farhaan.vvc@gmail.com to new user experience
---

Run the reset script from the backend directory to clear the user's onboarding data (nativeLang, englishLevel) and word history from MongoDB, giving them a fresh new-user flow on next login.

// turbo
1. Run the reset script:
```
node scripts/reset-user.js
```
(from `/Users/farhaaan/Documents/AI Projects/language learning AG/backend`)

2. Confirm output shows:
   - ✅ Cleared nativeLang and englishLevel
   - ✅ Deleted N word(s) from history
   - 🎉 User reset to new-user state.
