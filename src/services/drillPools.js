/**
 * Drill pools — extra phrase and conversation screens a lesson can draw on
 * when the learner is weak on a skill (adaptive phase 3, ADAPTIVE.md).
 *
 * Not part of any lesson's fixed plan. A lesson's own `phrases` and
 * `conversations` are its core and always run; adaptation may add up to two
 * drills from the pools of this lesson or earlier ones, aimed at weak skills.
 * curriculum.js attaches each list here as `lesson.pool`.
 *
 * Kept apart from curriculum.js on purpose: phase 4 generates pools at scale,
 * and a generator should be able to rewrite this file wholesale without
 * touching hand-written lessons. The shape is a lesson drill's shape plus:
 *   id       stable, `<lang initial><lesson>-<n>`; a resumed lesson rebuilds
 *            its plan from these ids, so never renumber a published one
 *   phase    'phrase' | 'conversation' — which round it joins
 *   source   'seed' (hand-written) | 'generated'
 *   reviewed false until a speaker of the language has read it
 * Skills are NOT written down: skills.tagStep derives them from `correct`,
 * like every other screen. Every word must be taught by the lesson it sits
 * under (gap-check), every listed answer must pass the grader
 * (matcher-check), and `native` must round-trip (script-check).
 */

export const DRILL_POOLS = {
    Kannada: {
        5: [
            { id: 'k5-1', phase: 'phrase', prompt: "Say 'my house'", correct: 'Nanna mane', native: 'ನನ್ನ ಮನೆ',
                meaning: 'My house', hint: 'My + house', acceptable: [],
                grammarNote: '*Nanna* goes in front, and *mane* does not change.', source: 'seed', reviewed: false },
            { id: 'k5-2', phase: 'conversation', prompt: "Ask Miko 'Where is your house?'", correct: 'Nimma mane yelli?',
                native: 'ನಿಮ್ಮ ಮನೆ ಎಲ್ಲಿ?', meaning: 'Where is your house?', hint: 'Your + house + where',
                acceptable: ['nimma mane elli?'], grammarNote: 'The question word goes last: *nimma mane yelli?*', source: 'seed', reviewed: false },
            { id: 'k5-3', phase: 'phrase', prompt: "Say 'her story', respectfully", correct: 'Avara kathe', native: 'ಅವರ ಕಥೆ',
                meaning: 'Her story', hint: 'Her (respectful) + story', acceptable: [], source: 'seed', reviewed: false },
        ],
        6: [
            { id: 'k6-1', phase: 'phrase', prompt: "Ask 'Who is your friend?'", correct: 'Nimma snehita yaaru?',
                native: 'ನಿಮ್ಮ ಸ್ನೇಹಿತ ಯಾರು?', meaning: 'Who is your friend?', hint: 'Your + friend + who',
                acceptable: [], grammarNote: '*Yaaru* goes last, like *yenu* and *yelli*.', source: 'seed', reviewed: false },
            { id: 'k6-2', phase: 'conversation', prompt: 'Point across the room and tell Miko: that person is my teacher.',
                correct: 'Avaru nanna shikshaka', native: 'ಅವರು ನನ್ನ ಶಿಕ್ಷಕ', meaning: 'That person is my teacher',
                hint: 'That person + my + teacher', acceptable: [], source: 'seed', reviewed: false },
            { id: 'k6-3', phase: 'phrase', prompt: "Say 'This is his elder sister'", correct: 'Ivaru aatana akka',
                native: 'ಇವರು ಆತನ ಅಕ್ಕ', meaning: 'This is his elder sister', hint: 'This person + his + elder sister',
                acceptable: [], source: 'seed', reviewed: false },
        ],
        7: [
            { id: 'k7-1', phase: 'phrase', prompt: "Say 'three houses'", correct: 'Mooru mane', native: 'ಮೂರು ಮನೆ',
                meaning: 'Three houses', hint: 'Three + house', acceptable: [], source: 'seed', reviewed: false },
            { id: 'k7-2', phase: 'conversation', prompt: 'Ask Miko for one water.', correct: 'Ondu neeru beku',
                native: 'ಒಂದು ನೀರು ಬೇಕು', meaning: 'I want one water', hint: 'One + water + want',
                acceptable: [], grammarNote: '*Beku* goes last, after the thing you want.', source: 'seed', reviewed: false },
            { id: 'k7-3', phase: 'phrase', prompt: "Say 'two stories'", correct: 'Eradu kathe', native: 'ಎರಡು ಕಥೆ',
                meaning: 'Two stories', hint: 'Two + story', acceptable: [], source: 'seed', reviewed: false },
        ],
        8: [
            { id: 'k8-1', phase: 'phrase', prompt: "Say 'my houses'", correct: 'Nanna manegalu', native: 'ನನ್ನ ಮನೆಗಳು',
                meaning: 'My houses', hint: 'My + houses', acceptable: [],
                grammarNote: 'A house is a thing, so it takes -galu.', source: 'seed', reviewed: false },
            { id: 'k8-2', phase: 'conversation', prompt: "Ask Miko 'Where are the books?'", correct: 'Pustakagalu yelli?',
                native: 'ಪುಸ್ತಕಗಳು ಎಲ್ಲಿ?', meaning: 'Where are the books?', hint: 'Books + where',
                acceptable: ['pustakagalu elli?'], source: 'seed', reviewed: false },
            { id: 'k8-3', phase: 'phrase', prompt: "Say 'your friends'", correct: 'Nimma snehitaru', native: 'ನಿಮ್ಮ ಸ್ನೇಹಿತರು',
                meaning: 'Your friends', hint: 'Your + friends', acceptable: [],
                grammarNote: 'Friends are people, so -aru, not -galu.', source: 'seed', reviewed: false },
        ],
        9: [
            { id: 'k9-1', phase: 'phrase', prompt: "Say 'a small book'", correct: 'Chikka pustaka', native: 'ಚಿಕ್ಕ ಪುಸ್ತಕ',
                meaning: 'A small book', hint: 'Small + book', acceptable: [], source: 'seed', reviewed: false },
            { id: 'k9-2', phase: 'phrase', prompt: "Say 'a good friend'", correct: 'Olleya snehita', native: 'ಒಳ್ಳೆಯ ಸ್ನೇಹಿತ',
                meaning: 'A good friend', hint: 'Good + friend', acceptable: [],
                grammarNote: '*Olleya* goes in front of the noun.', source: 'seed', reviewed: false },
            { id: 'k9-3', phase: 'conversation', prompt: 'Miko finishes telling you a story. Tell her it is good.',
                correct: 'Kathe chennagide', native: 'ಕಥೆ ಚೆನ್ನಾಗಿದೆ', meaning: 'The story is good',
                hint: 'Story + it is good', acceptable: [], source: 'seed', reviewed: false },
        ],
        10: [
            { id: 'k10-1', phase: 'conversation', prompt: 'Ask the shopkeeper how much the water is.', correct: 'Neeru eshtu?',
                native: 'ನೀರು ಎಷ್ಟು?', meaning: 'How much is the water?', hint: 'Water + how much',
                acceptable: ['neeru estu?'], source: 'seed', reviewed: false },
            { id: 'k10-2', phase: 'phrase', prompt: "Say 'water, please'", correct: 'Neeru kodi', native: 'ನೀರು ಕೊಡಿ',
                meaning: 'Please give water', hint: 'Water + give (please)', acceptable: [], source: 'seed', reviewed: false },
            { id: 'k10-3', phase: 'conversation', prompt: 'Catch the waiter: excuse yourself, then ask for the bill.',
                correct: 'Kshamisi, lekka kodi', native: 'ಕ್ಷಮಿಸಿ, ಲೆಕ್ಕ ಕೊಡಿ', meaning: 'Excuse me, the bill please',
                hint: 'Excuse me + bill + give', acceptable: ['kshamisi lekka kodi'], source: 'seed', reviewed: false },
        ],
        11: [
            { id: 'k11-1', phase: 'phrase', prompt: "Say 'I am here now'", correct: 'Naanu eega illi iddene',
                native: 'ನಾನು ಈಗ ಇಲ್ಲಿ ಇದ್ದೇನೆ', meaning: 'I am here now', hint: 'I + now + here + am',
                acceptable: ['eega illi iddene', 'naanu eega illi iddini', 'eega illi iddini'],
                grammarNote: '*Iddene* goes last, and its -ene already means “I”.', source: 'seed', reviewed: false },
            { id: 'k11-2', phase: 'conversation', prompt: "Miko calls. Tell her 'I am going there now'.",
                correct: 'Naanu eega alli hoguttiddene', native: 'ನಾನು ಈಗ ಅಲ್ಲಿ ಹೋಗುತ್ತಿದ್ದೇನೆ',
                meaning: 'I am going there now', hint: 'I + now + there + am going',
                acceptable: ['eega alli hoguttiddene', 'naanu eega alli hogtidini', 'eega alli hogtidini', 'naanu eega alli hoguttidini'],
                source: 'seed', reviewed: false },
            { id: 'k11-3', phase: 'phrase', prompt: "Say 'I am doing work now'", correct: 'Naanu eega kelasa maaduttiddene',
                native: 'ನಾನು ಈಗ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ', meaning: 'I am doing work now', hint: 'I + now + work + am doing',
                acceptable: ['eega kelasa maaduttiddene', 'naanu eega kelasa maadtidini', 'eega kelasa maadtidini', 'naanu eega kelasa maaduttidini'],
                source: 'seed', reviewed: false },
        ],
        12: [
            { id: 'k12-1', phase: 'phrase', prompt: "Say 'I will go tomorrow'", correct: 'Naale hoguttene', native: 'ನಾಳೆ ಹೋಗುತ್ತೇನೆ',
                meaning: 'I will go tomorrow', hint: 'Tomorrow + I-go',
                acceptable: ['naale naanu hoguttene', 'naanu naale hoguttene', 'naale hogtini'],
                grammarNote: 'The time word first, the action word last.', source: 'seed', reviewed: false },
            { id: 'k12-2', phase: 'conversation', prompt: 'Miko asks about lunch. Say \'Today I am eating here\'.',
                correct: 'Ivattu naanu illi tinnuttiddene', native: 'ಇವತ್ತು ನಾನು ಇಲ್ಲಿ ತಿನ್ನುತ್ತಿದ್ದೇನೆ',
                meaning: 'Today I am eating here', hint: 'Today + I + here + am eating',
                acceptable: ['ivattu illi tinnuttiddene', 'naanu ivattu illi tinnuttiddene', 'ivattu naanu illi tintidini', 'ivattu illi tintidini'],
                source: 'seed', reviewed: false },
            { id: 'k12-3', phase: 'conversation', prompt: "Miko asks when you'll come by. Say 'later, at two o'clock'.",
                correct: 'Aamele eradu gantege', native: 'ಆಮೇಲೆ ಎರಡು ಗಂಟೆಗೆ', meaning: "Later, at two o'clock",
                hint: 'Later + two + at-o\'clock', acceptable: ['aamele, eradu gantege', 'amele eradu gantege'],
                grammarNote: '*Gante* + -ge gives “at … o’clock”.', source: 'seed', reviewed: false },
        ],
    },
    Telugu: {
        5: [
            { id: 't5-1', phase: 'phrase', prompt: "Say 'My house'", correct: 'Naa illu', native: 'నా ఇల్లు',
                meaning: 'My house', hint: 'My + house', acceptable: [], source: 'seed', reviewed: false },
            { id: 't5-2', phase: 'conversation', prompt: "Ask Miko 'Where is your house?'", correct: 'Mee illu ekkada?',
                native: 'మీ ఇల్లు ఎక్కడ?', meaning: 'Where is your house?', hint: 'Your + house + where',
                acceptable: ['mee illu ekkada'], source: 'seed', reviewed: false },
            { id: 't5-3', phase: 'conversation', prompt: "Say 'I have a book'.", correct: 'Naaku pusthakam undi',
                native: 'నాకు పుస్తకం ఉంది', meaning: 'I have a book', hint: 'To me + book + there is',
                acceptable: ['naaku oka pusthakam undi'],
                grammarNote: '“I have” is *naaku* + *undi*: “to me a book there is”.', source: 'seed', reviewed: false },
        ],
        6: [
            { id: 't6-1', phase: 'phrase', prompt: "Ask 'Who is she?'", correct: 'Ame evaru?', native: 'ఆమె ఎవరు?',
                meaning: 'Who is she?', hint: 'She + who', acceptable: [], source: 'seed', reviewed: false },
            { id: 't6-2', phase: 'phrase', prompt: "Say 'She is my elder sister'", correct: 'Ame naa akka', native: 'ఆమె నా అక్క',
                meaning: 'She is my elder sister', hint: 'She + my + elder sister', acceptable: [], source: 'seed', reviewed: false },
            { id: 't6-3', phase: 'conversation', prompt: "Ask 'Who is your teacher?'", correct: 'Mee guruvu evaru?',
                native: 'మీ గురువు ఎవరు?', meaning: 'Who is your teacher?', hint: 'Your + teacher + who',
                acceptable: [], source: 'seed', reviewed: false },
        ],
        7: [
            { id: 't7-1', phase: 'conversation', prompt: 'Tell Miko you want one book.', correct: 'Oka pusthakam kaavali',
                native: 'ఒక పుస్తకం కావాలి', meaning: 'I want one book', hint: 'One + book + want',
                acceptable: ['naaku oka pusthakam kaavali'], source: 'seed', reviewed: false },
            { id: 't7-2', phase: 'conversation', prompt: 'Tell Miko you have one younger brother.', correct: 'Naaku oka thammudu undi',
                native: 'నాకు ఒక తమ్ముడు ఉంది', meaning: 'I have one younger brother', hint: 'To me + one + younger brother + there is',
                acceptable: ['oka thammudu undi'], source: 'seed', reviewed: false },
            { id: 't7-3', phase: 'phrase', prompt: 'Count 3, 4, 5.', correct: 'Moodu, naalugu, aidhu', native: 'మూడు, నాలుగు, ఐదు',
                meaning: 'Three, four, five', hint: 'Consecutive', acceptable: ['moodu naalugu aidhu'], source: 'seed', reviewed: false },
        ],
        8: [
            { id: 't8-1', phase: 'phrase', prompt: "Say 'Your books'", correct: 'Mee pusthakalu', native: 'మీ పుస్తకాలు',
                meaning: 'Your books', hint: 'Your + books', acceptable: [], source: 'seed', reviewed: false },
            { id: 't8-2', phase: 'phrase', prompt: "Say 'Many teachers'", correct: 'Chala guruvulu', native: 'చాలా గురువులు',
                meaning: 'Many teachers', hint: 'Many + teachers', acceptable: ['chaala guruvulu'], source: 'seed', reviewed: false },
            { id: 't8-3', phase: 'conversation', prompt: 'Tell Miko you want two chairs.', correct: 'Rendu kurchilu kaavali',
                native: 'రెండు కుర్చీలు కావాలి', meaning: 'I want two chairs', hint: 'Two + chairs + want',
                acceptable: ['naaku rendu kurchilu kaavali'], source: 'seed', reviewed: false },
        ],
        9: [
            { id: 't9-1', phase: 'phrase', prompt: "Say 'Small house'", correct: 'Chinna illu', native: 'చిన్న ఇల్లు',
                meaning: 'Small house', hint: 'Small + house', acceptable: [], source: 'seed', reviewed: false },
            { id: 't9-2', phase: 'conversation', prompt: "Say 'This story is good'.", correct: 'Ee katha bagundi',
                native: 'ఈ కథ బాగుంది', meaning: 'This story is good', hint: 'This + story + is good',
                acceptable: [], source: 'seed', reviewed: false },
            { id: 't9-3', phase: 'conversation', prompt: 'Ask for a big book.', correct: 'Pedda pusthakam kaavali',
                native: 'పెద్ద పుస్తకం కావాలి', meaning: 'I want a big book', hint: 'Big + book + want',
                acceptable: ['naaku pedda pusthakam kaavali'], source: 'seed', reviewed: false },
        ],
        10: [
            { id: 't10-1', phase: 'phrase', prompt: "Say 'Please give water'", correct: 'Neeru ivvandi', native: 'నీరు ఇవ్వండి',
                meaning: 'Please give water', hint: 'Water + give (please)', acceptable: [], source: 'seed', reviewed: false },
            { id: 't10-2', phase: 'conversation', prompt: 'Miko is standing. Ask her to sit, please.', correct: 'Miko, kurchondi',
                native: 'మికో, కూర్చోండి', meaning: 'Miko, please sit', hint: 'Name + sit (please)',
                acceptable: ['kurchondi', 'miko kurchondi'], source: 'seed', reviewed: false },
            { id: 't10-3', phase: 'phrase', prompt: "Say 'Food and water'", correct: 'Annam mariyu neeru', native: 'అన్నం మరియు నీరు',
                meaning: 'Food and water', hint: 'Food + and + water', acceptable: [], source: 'seed', reviewed: false },
        ],
        11: [
            { id: 't11-1', phase: 'phrase', prompt: "Say 'I am here now'", correct: 'Nenu ippudu ikkada unnanu',
                native: 'నేను ఇప్పుడు ఇక్కడ ఉన్నాను', meaning: 'I am here now', hint: 'I + now + here + am',
                acceptable: [], source: 'seed', reviewed: false },
            { id: 't11-2', phase: 'conversation', prompt: "Tell Miko 'I am going to work'.", correct: 'Nenu paniki velthunnanu',
                native: 'నేను పనికి వెళ్తున్నాను', meaning: 'I am going to work', hint: 'I + to work + going',
                acceptable: [], grammarNote: '*Pani* + -ki is “to work”, like *intiki*, “to the house”.', source: 'seed', reviewed: false },
            { id: 't11-3', phase: 'phrase', prompt: "Say 'I am doing this work now'", correct: 'Nenu ippudu ee pani chestunnanu',
                native: 'నేను ఇప్పుడు ఈ పని చేస్తున్నాను', meaning: 'I am doing this work now', hint: 'I + now + this + work + doing',
                acceptable: [], source: 'seed', reviewed: false },
        ],
        12: [
            { id: 't12-1', phase: 'conversation', prompt: "Say 'Tomorrow I am going to work'.", correct: 'Repu nenu paniki velthunnanu',
                native: 'రేపు నేను పనికి వెళ్తున్నాను', meaning: 'Tomorrow I am going to work', hint: 'Tomorrow + I + to work + going',
                acceptable: [], source: 'seed', reviewed: false },
            { id: 't12-2', phase: 'phrase', prompt: "Say 'Today I am eating here'", correct: 'Eeroju nenu ikkada tintunnanu',
                native: 'ఈరోజు నేను ఇక్కడ తింటున్నాను', meaning: 'Today I am eating here', hint: 'Today + I + here + eating',
                acceptable: [], source: 'seed', reviewed: false },
            { id: 't12-3', phase: 'conversation', prompt: "Say 'Tomorrow I am doing work'.", correct: 'Repu nenu pani chestunnanu',
                native: 'రేపు నేను పని చేస్తున్నాను', meaning: 'Tomorrow I am doing work', hint: 'Tomorrow + I + work + doing',
                acceptable: [], source: 'seed', reviewed: false },
        ],
    },
};
