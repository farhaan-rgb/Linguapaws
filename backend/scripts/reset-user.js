/**
 * reset-user.js
 * Resets farhaan.vvc@gmail.com to a fresh new-user state:
 *   - Clears nativeLang + englishLevel from the User document
 *   - Deletes all Word history for that user
 *
 * Usage: node scripts/reset-user.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Word = require('../models/Word');

const EMAIL = 'farhaan.vvc@gmail.com';

async function main() {
    const uri = process.env.MONGODB_URI;
    const isHosted = /mongodb\+srv:\/\//i.test(uri || '');
    const targetLabel = isHosted ? 'HOSTED' : 'LOCAL';

    console.log(`\n=== Resetting ${targetLabel} user data for: ${EMAIL} ===`);
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB (${targetLabel})`);

    const user = await User.findOne({ email: EMAIL });
    if (!user) {
        console.error(`❌  No user found with email: ${EMAIL}`);
        process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email}), _id: ${user._id}`);

    // 1. Clear onboarding fields
    await User.findByIdAndUpdate(user._id, {
        $unset: { nativeLang: '', englishLevel: '', targetLang: '' },
    });
    console.log('✅  Cleared nativeLang and englishLevel');

    // 2. Delete all word history
    const result = await Word.deleteMany({ userId: user._id });
    console.log(`✅  Deleted ${result.deletedCount} word(s) from history`);

    console.log('\n🎉  User reset to new-user state. They will see the onboarding flow on next login.');
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
