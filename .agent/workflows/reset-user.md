---
description: Reset farhaan.vvc@gmail.com to new user experience
---

// turbo-all
1. Delete the user and their word history from MongoDB

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Word = require('./models/Word');
  const user = await User.findOneAndDelete({ email: 'farhaan.vvc@gmail.com' });
  if (user) {
    await Word.deleteMany({ userId: user._id });
    console.log('✅ Deleted user and words:', user.email);
  } else {
    console.log('ℹ️  User not found (already clean)');
  }
  mongoose.disconnect();
});"
```

Run this from: `/Users/farhaaan/Documents/AI Projects/language learning AG/backend`

2. Open the browser console (`Cmd + Option + J`) on the app tab and run:

```js
localStorage.clear(); sessionStorage.clear(); location.reload();
```

You now have a fresh new user experience.
