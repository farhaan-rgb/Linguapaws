export const CURRICULUM = {
    Telugu: [
        // Phase 1: The Foundation (Lessons 1–10)
        {
            scenario: "Pronouns & Greetings",
            icon: "👋",
            color: "#e0f2fe",
            vocabulary: [
                { word: "Namaskaram", meaning: "Hello", phonetic: "nah-mas-kah-ram" },
                { word: "Nenu", meaning: "I", phonetic: "neh-noo" },
                { word: "Meeru", meaning: "You", phonetic: "mee-roo" },
                { word: "Bagunnanu", meaning: "I'm fine", phonetic: "bah-goon-nah-noo", alt: ["bagunna"] },
                { word: "Ela", meaning: "How", phonetic: "eh-lah" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskaram, nenu bagunnanu", meaning: "Hello, I am fine", hint: "Hello + I + fine", acceptable: ["namaskaram, nenu bagunna", "namaskaram bagunnanu", "namaskaram bagunna"],
                  grammarNote: "Look at what you just built — *bagunnanu* is doing two jobs at once: *bagu* (\"well\") plus *unnanu* (\"I am\"). Telugu packs the \"I\" into the ending, which is why there is no separate word for \"am\"." },
                { prompt: "Ask 'How are you?'", correct: "Meeru ela", meaning: "How are you?", hint: "You + how?",
                  acceptable: ["meeru ela unnaru", "meeru ela unnaru?"],
                  grammarNote: "That works. One thing you will hear from natives: they add *unnaru* on the end — *Meeru ela unnaru?* — which is the polite verb \"are\". Your version is perfectly understandable." },
                { prompt: "Say 'I am fine, and you?'", correct: "Nenu bagunnanu, meeru?", meaning: "I am fine, and you?", hint: "I + fine + you?", acceptable: ["nenu bagunna, meeru?", "bagunnanu, meeru?", "bagunna, meeru?"],
                  grammarNote: "You used *nenu* there for contrast — \"I'm fine, and **you**?\". Because the -nu ending already says \"I\", *nenu* is optional; you add it when you want to stress who you mean." }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskaram, nenu bagunnanu", meaning: "Hello, I am fine", hint: "Basic greeting + state", acceptable: ["namaskaram, nenu bagunna", "namaskaram bagunnanu", "namaskaram bagunna"],
                  grammarNote: "Swap that -nu ending and the subject changes: *bagunnaru* means \"you are fine\". Same word, different ending, different person — you will meet this pattern on every Telugu verb." },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, meeru ela", meaning: "Miko, how are you?", hint: "Name + you + how?",
                  acceptable: ["miko, meeru ela unnaru?", "miko meeru ela unnaru", "miko, meeru ela unnaru", "miko meeru ela unnaru?"],
                  grammarNote: "Natives would say *Miko, meeru ela unnaru?* — same sentence with the polite verb added on the end." },
                { prompt: "Someone asks how you are. Answer: 'I am fine'.", correct: "Nenu bagunnanu", meaning: "I am fine", hint: "Direct answer", acceptable: ["nenu bagunna", "bagunnanu", "bagunna"],
                  grammarNote: "In relaxed speech people clip this to *bagunna*, dropping the -nu. You will hear both, and either is accepted here." },
                { prompt: "Say hello, tell them you are fine, and ask how they are.", correct: "Namaskaram, nenu bagunnanu. Meeru ela", meaning: "Hello, I am fine, how are you?", hint: "Full intro",
                  acceptable: ["namaskaram, nenu bagunna. meeru ela", "namaskaram, nenu bagunnanu. meeru ela unnaru?", "namaskaram, nenu bagunna. meeru ela unnaru?", "namaskaram nenu bagunna meeru ela unnaru?", "namaskaram, nenu bagunna. meeru ela unnaru"],
                  grammarNote: "That is the whole greeting exchange in one go. Add *unnaru* on the end — *Meeru ela unnaru?* — whenever you want the polite form." }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Idhi", meaning: "This", phonetic: "ee-dhee", teach: "“This” is {w}, and it comes *first* — before the thing you are pointing at." },
                { word: "Adhi", meaning: "That", phonetic: "ah-dhee", teach: "“That” is {w} — for something further away. It also comes before the noun." },
                { word: "Emiti", meaning: "What", phonetic: "eh-mee-tee", teach: "“What” on its own is {w}. In Telugu the question word goes at the *end* of the sentence, never the start — so it follows whatever you are asking about." },
                { word: "Pusthakam", meaning: "Book", phonetic: "poos-tah-kam" },
                { word: "Peru", meaning: "Name", phonetic: "peh-roo" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Idhi emiti?", meaning: "What is this?", hint: "This + what?" },
                { prompt: "Say 'This is a book'", correct: "Idhi pusthakam", meaning: "This is a book", hint: "This + book" },
                { prompt: "Combine 'You' (from last lesson) and 'Name What?'", correct: "Meeru peru emiti?", meaning: "What is your name?", hint: "You + name + what?", grammarNote: "In casual spoken Telugu, stringing together *You + Name + What* works. Later you will meet the strict possessive *Mee*." }
            ],
            conversations: [
                { prompt: "Say hello (from last lesson), and ask 'What is this?'", correct: "Namaskaram, idhi emiti?", meaning: "Hello, what is this?", hint: "Hello + this + what?" },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Adhi emiti?", meaning: "What is that?", hint: "Distant question" },
                { prompt: "Tell Miko 'This is a book'", correct: "Idhi pusthakam", meaning: "This is a book", hint: "Simple statement" },
                { prompt: "Ask a stranger what their name is using words you know.", correct: "Meeru peru emiti?", meaning: "What is your name?", hint: "You + name + what?" }
            ]
        },
        {
            scenario: "The 'Where' & 'Going'",
            vocabulary: [
                { word: "Ekkada", meaning: "Where", phonetic: "ek-kah-dah", teach: "“Where” is {w}. Like every Telugu question word it lands at the end of the sentence, not the beginning." },
                { word: "Vellu", meaning: "Go", phonetic: "vel-loo" },
                { word: "Ikkada", meaning: "Here", phonetic: "ik-kah-dah" },
                { word: "Akkada", meaning: "There", phonetic: "ak-kah-dah" },
                { word: "Inti", meaning: "Home/House", phonetic: "in-tee" }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Inti ekkada?", meaning: "Where is the house?", hint: "House + where?" },
                { prompt: "Say 'I am here' (Use 'I' from Scenario 1)", correct: "Nenu ikkada", meaning: "I am here", hint: "I + here" },
                { prompt: "Say 'Go there'", correct: "Akkada vellandi", meaning: "Go there", hint: "There + go" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Inti ekkada?", meaning: "Where is the home?", hint: "Location question" },
                { prompt: "Tell someone to go there.", correct: "Akkada vellandi", meaning: "Go there", hint: "Direction" },
                { prompt: "Someone asks 'Meeru ekkada?'. Connect 'I am here' with 'You?' (from Scenario 1).", correct: "Nenu ikkada, meeru?", meaning: "I am here, and you?", hint: "I + here + you?" },
                { prompt: "Say 'I go home'. Start with 'I' (Nenu).", correct: "Nenu intiki velthanu", meaning: "I go home", hint: "I + home + go", grammarNote: "Word for word that is \"I home go\". Telugu puts the verb last — Subject, Object, Verb." }
            ]
        },
        {
            scenario: "Desires & Negation",
            vocabulary: [
                { word: "Kaavali", meaning: "Want", phonetic: "kah-vah-lee" },
                { word: "Oddu", meaning: "Don't want", phonetic: "od-dhoo" },
                { word: "Annam", meaning: "Food", phonetic: "an-nam" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-roo" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" }
            ],
            phrases: [
                { prompt: "Say 'Want water'", correct: "Neeru kaavali", meaning: "I want water", hint: "Water + want" },
                { prompt: "Say 'Don't want food'", correct: "Annam oddu", meaning: "I don't want food", hint: "Food + don't want" },
                { prompt: "Say 'Okay, I want this' (Use 'This' from Scenario 2)", correct: "Sare, idhi kaavali", meaning: "Okay, I want this", hint: "Okay + this + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Say 'Okay, water want'.", correct: "Sare, neeru kaavali", meaning: "Okay, I want water", hint: "Okay + water + want" },
                { prompt: "Miko offers you food you don't like. Say 'Food don't want'.", correct: "Annam oddu", meaning: "I don't want food", hint: "Food + don't want" },
                { prompt: "Point to a book (from Scenario 2) and say 'Book want'.", correct: "Pusthakam kaavali", meaning: "I want the book", hint: "Book + want" },
                { prompt: "Point far away and say 'That don't want' (Use 'That' from Scenario 2).", correct: "Adhi oddu", meaning: "I don't want that", hint: "That + don't want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Naa", meaning: "My", phonetic: "nah" },
                { word: "Mee", meaning: "Your", phonetic: "mee" },
                { word: "Ayana", meaning: "He (respectful) / his", phonetic: "ah-yah-nah", teach: "{w} covers both “he” and “his”, and it is the *respectful* form — use it for elders, teachers and strangers." },
                { word: "Ame", meaning: "Her", phonetic: "ah-meh" },
                { word: "Katha", meaning: "Story", phonetic: "kah-thah" }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Naa peru", meaning: "My name", hint: "My + name" },
                { prompt: "Say 'Your book'", correct: "Mee pusthakam", meaning: "Your book", hint: "Your + book" },
                { prompt: "Say 'His story'", correct: "Ayana katha", meaning: "His story", hint: "His + story" }
            ],
            conversations: [
                { prompt: "Introduce yourself: 'Hello, my name is...' (Namaskaram, naa peru...)", correct: "Namaskaram, naa peru Ravi", meaning: "Hello, my name is Ravi", hint: "Greeting + My + Name" },
                { prompt: "Identify a book as 'your book'.", correct: "Adhi mee pusthakam", meaning: "That is your book", hint: "That + your + book" },
                { prompt: "Say 'This is my story'.", correct: "Idhi naa katha", meaning: "This is my story", hint: "This + my + story" },
                { prompt: "Point to a girl and say 'Her name'.", correct: "Ame peru", meaning: "Her name", hint: "Her + name" }
            ]
        },
        {
            scenario: "The 'Who'",
            icon: "👤",
            color: "#ede9fe",
            vocabulary: [
                { word: "Evaru", meaning: "Who", phonetic: "eh-vah-roo", teach: "“Who” is {w} — and it goes at the end of the question, Telugu-style." },
                { word: "Snehithudu", meaning: "Friend", phonetic: "sneh-hee-thoo-doo" },
                { word: "Guruvu", meaning: "Teacher", phonetic: "goo-roo-voo" },
                { word: "Thammudu", meaning: "Younger Brother", phonetic: "tham-moo-doo" },
                { word: "Akka", meaning: "Elder Sister", phonetic: "ak-kah" }
            ],
            phrases: [
                { prompt: "Ask 'Who is this?'", correct: "Ithanu evaru?", meaning: "Who is this?", hint: "This + who?" },
                { prompt: "Say 'He is my friend' (using Snehithudu)", correct: "Ayana naa snehithudu", meaning: "He is my friend", hint: "His + my + friend" },
                { prompt: "Ask 'Who are you?'", correct: "Meeru evaru?", meaning: "Who are you?", hint: "You + who?" }
            ],
            conversations: [
                { prompt: "Someone knocks. Ask 'Who is it?'", correct: "Evaru?", meaning: "Who?", hint: "Short question" },
                { prompt: "Introduce Miko as your friend.", correct: "Miko naa snehithudu", meaning: "Miko is my friend", hint: "Name + my + friend" },
                { prompt: "Point to your teacher and say 'He is my teacher'.", correct: "Ayana naa guruvu", meaning: "He is my teacher", hint: "He(Ayana) + my + teacher" },
                { prompt: "Ask 'Who is your brother?'", correct: "Mee thammudu evaru?", meaning: "Who is your brother?", hint: "Your + brother + who?" }
            ]
        },
        {
            scenario: "Basic Numbers",
            icon: "🔢",
            color: "#fae8ff",
            vocabulary: [
                { word: "Okati", meaning: "One", phonetic: "oh-kah-tee" },
                { word: "Rendu", meaning: "Two", phonetic: "ren-doo" },
                { word: "Moodu", meaning: "Three", phonetic: "moo-doo" },
                { word: "Naalugu", meaning: "Four", phonetic: "nah-loo-goo" },
                { word: "Aidhu", meaning: "Five", phonetic: "eye-dhoo" }
            ],
            phrases: [
                { prompt: "Say 'One book'", correct: "Oka pusthakam", meaning: "One book", hint: "One + book" },
                { prompt: "Say 'Two friends'", correct: "Rendu snehithulu", meaning: "Two friends", hint: "Two + friends(pl)" },
                { prompt: "Say 'Five houses'", correct: "Aidhu illu", meaning: "Five houses", hint: "Five + house" }
            ],
            conversations: [
                { prompt: "Miko asks how many books. Say 'Three books'.", correct: "Moodu pusthakalu", meaning: "Three books", hint: "Three + books" },
                { prompt: "Say 'I want two' (using Rendu kaavali).", correct: "Rendu kaavali", meaning: "I want two", hint: "Number + want" },
                { prompt: "Tell Miko 'I have one sister' (using Naaku oka akka undi).", correct: "Naaku oka akka undi", meaning: "I have one sister", hint: "My + sister + number" },
                { prompt: "Count 1, 2, 3.", correct: "Okati, rendu, moodu", meaning: "1, 2, 3", hint: "Consecutive" }
            ]
        },
        {
            scenario: "Plurals",
            icon: "📚",
            color: "#fff1f2",
            vocabulary: [
                { word: "Lu", meaning: "(Plural suffix)", phonetic: "loo", teach: "{w} is not a word you can say on its own — it is the *ending* you attach to a noun to make it plural." },
                { word: "Pusthakalu", meaning: "Books", phonetic: "poos-tah-kah-loo" },
                { word: "Snehithulu", meaning: "Friends", phonetic: "sneh-hee-thoo-loo" },
                { word: "Illu", meaning: "Houses (sg. illu; inti- is its oblique stem)", phonetic: "il-loo", teach: "“House” is {w}. When it takes an ending it shifts to inti- — that is the form you already met." },
                { word: "Kurchilu", meaning: "Chairs", phonetic: "koor-chee-loo" }
            ],
            phrases: [
                { prompt: "Say 'Many books' (Chala pusthakalu)", correct: "Chala pusthakalu", meaning: "Many books", hint: "Many + books" },
                { prompt: "Say 'My friends'", correct: "Naa snehithulu", meaning: "My friends", hint: "My + friends" }
            ],
            conversations: [
                { prompt: "Tell Miko you have many friends.", correct: "Naaku chala mandi snehithulu unnaru", meaning: "I have many friends", hint: "My + many + friends" },
                { prompt: "Ask 'Where are the books?'", correct: "Pusthakalu ekkada?", meaning: "Where are the books?", hint: "Books + where?" },
                { prompt: "Say 'I don't want these houses'.", correct: "Ee illu oddu", meaning: "I don't want these houses", hint: "These + houses + don't want" },
                { prompt: "Final check: Say 'Hello my friends'.", correct: "Namaskaram naa snehithulu", meaning: "Hello my friends", hint: "Hello + my + friends" }
            ]
        },
        {
            scenario: "Basic Adjectives",
            icon: "✨",
            color: "#ecfdf5",
            vocabulary: [
                { word: "Pedda", meaning: "Big", phonetic: "ped-dah" },
                { word: "Chinna", meaning: "Small", phonetic: "chin-nah" },
                { word: "Manchi", meaning: "Good", phonetic: "man-chee" },
                { word: "Chedu", meaning: "Bad", phonetic: "cheh-doo" },
                { word: "Vedi", meaning: "Hot", phonetic: "veh-dee" }
            ],
            phrases: [
                { prompt: "Say 'Big house'", correct: "Pedda illu", meaning: "Big house", hint: "Big + house" },
                { prompt: "Say 'Good friend'", correct: "Manchi snehithudu", meaning: "Good friend", hint: "Good + friend" },
                { prompt: "Say 'A little water'", correct: "Konchem neeru", meaning: "A little water", hint: "Small + water" }
            ],
            conversations: [
                { prompt: "Tell Miko 'This is a big book'.", correct: "Idhi pedda pusthakam", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Ask for 'Hot water' (Vedi neeru kaavali).", correct: "Vedi neeru kaavali", meaning: "I want hot water", hint: "Hot + water + want" },
                { prompt: "Say 'He is a good teacher'.", correct: "Ayana manchi guruvu", meaning: "He is a good teacher", hint: "He + good + teacher" },
                { prompt: "Say 'That is bad'.", correct: "Adhi bagoledu", meaning: "That is bad", hint: "That + bad" }
            ]
        },
        {
            scenario: "Review & Survival Dialogue",
            icon: "🍽️",
            color: "#fee2e2",
            vocabulary: [
                { word: "Bhojanam", meaning: "Meal", phonetic: "bho-jah-nam" },
                { word: "Billu", meaning: "Bill", phonetic: "bil-loo" },
                { word: "Ivvandi", meaning: "Give (please)", phonetic: "iv-van-dee", teach: "A polite “please give” is {w}. That -andi ending is what turns any Telugu command polite — you will reuse it constantly." },
                { word: "Dhanyavaadaalu", meaning: "Thank you", phonetic: "dhan-yah-vaa-daa-loo" },
                { word: "Kurchondi", meaning: "Sit (please)", phonetic: "koor-chon-dee", teach: "A polite “please sit” is {w} — the same -andi politeness ending you just met." }
            ],
            phrases: [
                { prompt: "Say 'Please give the bill'", correct: "Billu ivvandi", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'Thank you Miko'", correct: "Dhanyavaadaalu Miko", meaning: "Thank you Miko", hint: "Thanks + Name" },
                { prompt: "Say 'I want a meal'", correct: "Bhojanam kaavali", meaning: "I want a meal", hint: "Meal + want" }
            ],
            conversations: [
                { prompt: "Order a meal and water.", correct: "Bhojanam kaavali, neeru kaavali", meaning: "I want a meal, I want water", hint: "Meal + want + water + want" },
                { prompt: "Ask the waiter for the bill.", correct: "Billu ivvandi", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'This meal is good'.", correct: "Ee bhojanam bagundi", meaning: "This meal is good", hint: "This + meal + good" },
                { prompt: "Final check: Say hello, thank you.", correct: "Namaskaram, dhanyavaadaalu", meaning: "Hello, thank you", hint: "Greet + Thanks" }
            ]
        },

        // Phase 2: The "Action" Phase (Lessons 11–20)
        {
            scenario: "Present Continuous",
            vocabulary: [
                { word: "Chestunnanu", meaning: "I am doing", phonetic: "ches-thoon-nah-noo", teach: "**Chestunnanu** is one word meaning “I am doing”. That -nu on the end *is* the “I”." },
                { word: "Tintunnanu", meaning: "I am eating", phonetic: "theen-toon-nah-noo" },
                { word: "Velthunnanu", phonetic: "vel-thoon-nah-noo", meaning: "I am going" },
                { word: "Ippudu", meaning: "Now", phonetic: "ip-poo-doo" },
                { word: "Pani", meaning: "Work", phonetic: "pah-nee" }
            ],
            phrases: [
                { prompt: "Say 'I am doing work'", correct: "Nenu pani chestunnanu", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Say 'I am going now'", correct: "Nenu ippudu velthunnanu", meaning: "I am going now", hint: "I + now + going" },
                { prompt: "Say 'I am eating food'", correct: "Nenu annam tintunnanu", meaning: "I am eating food", hint: "I + food + eating" }
            ],
            conversations: [
                { prompt: "Miko asks what you're doing. Say 'I am doing work'.", correct: "Nenu pani chestunnanu", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Tell someone 'I am going home now'.", correct: "Nenu ippudu intiki velthunnanu", meaning: "I am going home now", hint: "I + now + home + going" },
                { prompt: "Say 'I am eating' when asked.", correct: "Nenu tintunnanu", meaning: "I am eating", hint: "I + eating" },
                { prompt: "Final check: 'I am doing this now'.", correct: "Nenu ippudu idhi chestunnanu", meaning: "I am doing this now", hint: "I + now + this + doing" }
            ]
        },
        {
            scenario: "The 'When' (Time)",
            vocabulary: [
                { word: "Eeroju", meaning: "Today", phonetic: "ee-roh-joo" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "reh-poo" },
                { word: "Ninna", meaning: "Yesterday", phonetic: "nin-nah" },
                { word: "Appudu", meaning: "Then", phonetic: "ap-poo-doo" },
                { word: "Ganta", meaning: "Hour", phonetic: "gan-tah" }
            ],
            phrases: [
                { prompt: "Say 'Today I am going'", correct: "Eeroju nenu velthunnanu", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'Yesterday I did'", correct: "Ninna nenu chesanu", meaning: "Yesterday I did", hint: "Yesterday + I + did" },
                { prompt: "Say 'Tomorrow one hour'", correct: "Repu oka ganta", meaning: "Tomorrow one hour", hint: "Tomorrow + one + hour" }
            ],
            conversations: [
                { prompt: "Tell Miko you are going today.", correct: "Eeroju nenu velthunnanu", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'I will do it tomorrow'.", correct: "Nenu repu chestanu", meaning: "I will do tomorrow", hint: "I + tomorrow + will do" },
                { prompt: "Ask if they are going today", correct: "Eeroju meeru velthunnara?", meaning: "Are you going today?", hint: "Today + you + going(q)?" },
                { prompt: "Say 'I ate yesterday'.", correct: "Nenu ninna thinnanu", meaning: "I ate yesterday", hint: "I + yesterday + ate" }
            ]
        },
        {
            scenario: "Simple Past Tense",
            vocabulary: [
                { word: "Chesanu", meaning: "I did", phonetic: "cheh-sah-noo", teach: "**Chesanu** is “I did”, not just “did”. Change that -nu ending and the subject changes with it: *chesaru* is “you did”, *chesadu* is “he did”." },
                { word: "Vellanu", meaning: "I went", phonetic: "vel-lah-noo" },
                { word: "Thinnanu", meaning: "I ate", phonetic: "thin-nah-noo" },
                { word: "Chusanu", meaning: "I saw", phonetic: "choo-sah-noo" },
                { word: "Cheppanu", meaning: "I spoke / I said", phonetic: "chep-pah-noo" }
            ],
            phrases: [
                { prompt: "Say 'I went home'", correct: "Nenu intiki vellanu", meaning: "I went home", hint: "I + home + went" },
                { prompt: "Say 'I saw that'", correct: "Nenu adhi chusanu", meaning: "I saw that", hint: "I + that + saw" },
                { prompt: "Say 'I ate food'", correct: "Nenu annam thinnanu", meaning: "I ate food", hint: "I + food + ate" }
            ],
            conversations: [
                { prompt: "Miko asks about your trip. Say 'I went there'.", correct: "Nenu akkada vellanu", meaning: "I went there", hint: "I + there + went" },
                { prompt: "Say 'I did that yesterday'.", correct: "Nenu ninna adhi chesanu", meaning: "I did that yesterday", hint: "I + yesterday + that + did" },
                { prompt: "Confirm you saw Miko.", correct: "Nenu Miko chusanu", meaning: "I saw Miko", hint: "I + name + saw" },
                { prompt: "Final check: 'I went and I ate'.", correct: "Nenu vellanu, nenu thinnanu", meaning: "I went, I ate", hint: "I + went + I + ate" }
            ]
        },
        {
            scenario: "Simple Future Tense",
            vocabulary: [
                { word: "Chestanu", meaning: "I will do", phonetic: "ches-tah-noo", teach: "**Chestanu** is “I will do” — the same -nu ending doing the same job as in the past tense. “You will do” is *chestaru*." },
                { word: "Velthanu", meaning: "I will go", phonetic: "vel-thah-noo" },
                { word: "Tintanu", meaning: "I will eat", phonetic: "theen-tah-noo" },
                { word: "Chustanu", meaning: "I will see", phonetic: "choos-tah-noo" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "reh-poo" }
            ],
            phrases: [
                { prompt: "Say 'I will go tomorrow'", correct: "Nenu repu velthanu", meaning: "I will go tomorrow", hint: "I + tomorrow + will go" },
                { prompt: "Say 'I will eat now'", correct: "Nenu ippudu tintanu", meaning: "I will eat now", hint: "I + now + will eat" },
                { prompt: "Say 'I will see you'", correct: "Nenu mimmalni chustanu", meaning: "I will see you", hint: "I + you + will see" }
            ],
            conversations: [
                { prompt: "Miko asks if you'll help. Say 'I will do it'.", correct: "Nenu chestanu", meaning: "I will do", hint: "I + will do" },
                { prompt: "Tell someone 'I will go home tomorrow'.", correct: "Nenu repu intiki velthanu", meaning: "I will go home tomorrow", hint: "I + tomorrow + home + will go" },
                { prompt: "Say 'I will see that movie'.", correct: "Nenu aa cinema chustanu", meaning: "I will see that movie", hint: "I + that + movie + see" },
                { prompt: "Final check: 'I will eat soon'.", correct: "Nenu tharuvatha tintanu", meaning: "I will eat later", hint: "I + later + will eat" }
            ]
        },
        {
            scenario: "Asking 'Why' (Enduku)",
            vocabulary: [
                { word: "Enduku", meaning: "Why", phonetic: "en-doo-koo", teach: "“Why” is {w}. It usually opens the question in speech, but it can also sit at the end." },
                { word: "Andhuke", meaning: "That's why", phonetic: "an-dhoo-keh" },
                { word: "Ishtam", meaning: "Like", phonetic: "ish-tam" },
                { word: "Ledu", meaning: "No/Not", phonetic: "leh-doo", teach: "“No” is {w}. It doubles as “is not” / “there isn’t”, and it goes at the end." },
                { word: "Bhayam", meaning: "Fear", phonetic: "bhah-yam" }
            ],
            phrases: [
                { prompt: "Ask 'Why are you going?'", correct: "Meeru enduku velthunnaru?", meaning: "Why are you going?", hint: "You + why + going?" },
                { prompt: "Say 'Because I like it'", correct: "Endukante naaku ishtam", meaning: "That's why I like", hint: "Because + I + like" },
                { prompt: "Ask 'Why this?'", correct: "Idhi enduku?", meaning: "Why this?", hint: "This + why?" }
            ],
            conversations: [
                { prompt: "Miko asks why you're leaving. Say 'Because I am tired' (using simple words).", correct: "Andhuke nenu velthunnanu", meaning: "That's why I am going", hint: "Because + I + going" },
                { prompt: "Ask someone why they want that.", correct: "Adhi enduku kaavali?", meaning: "Why want that?", hint: "That + why + want" },
                { prompt: "Say 'I don't know why'.", correct: "Naaku enduku ani teliyadu", meaning: "I don't know why", hint: "Why + I + not" },
                { prompt: "Ask 'Why are you here?'", correct: "Meeru enduku ikkada?", meaning: "Why are you here?", hint: "You + why + here?" }
            ]
        },
        {
            scenario: "The 'How' (Ela)",
            vocabulary: [
                { word: "Ela", meaning: "How", phonetic: "eh-lah", teach: "\u201cHow\u201d is {w}. It goes right before the verb, not at the front like English." },
                { word: "Baga", meaning: "Well", phonetic: "bah-gah" },
                { word: "Tvaraga", meaning: "Quickly", phonetic: "tvah-rah-gah" },
                { word: "Mellaga", meaning: "Slowly", phonetic: "mel-lah-gah" },
                { word: "Santhosham", meaning: "Happy", phonetic: "san-tho-sham" }
            ],
            phrases: [
                { prompt: "Ask 'How to do?'", correct: "Ela cheyali?", meaning: "How to do?", hint: "How + do?" },
                { prompt: "Say 'Go slowly'", correct: "Mellaga vellandi", meaning: "Go slowly", hint: "Slowly + go" },
                { prompt: "Say 'I am doing well'", correct: "Nenu baga chestunnanu", meaning: "I am doing well", hint: "I + well + doing" }
            ],
            conversations: [
                { prompt: "Ask Miko how to eat this.", correct: "Idhi ela thinali?", meaning: "How to eat this?", hint: "This + how + eat?" },
                { prompt: "Tell someone to do it quickly.", correct: "Tvaraga cheyandi", meaning: "Do quickly", hint: "Quickly + do" },
                { prompt: "Say 'I am very happy'.", correct: "Nenu chala santhoshamga unnanu", meaning: "I am very happy", hint: "I + well + happy" },
                { prompt: "Ask 'How is your friend?'.", correct: "Mee snehithudu ela unnaru?", meaning: "How is your friend?", hint: "Your + friend + how?" }
            ]
        },
        {
            scenario: "Family Relations",
            vocabulary: [
                { word: "Amma", meaning: "Mother", phonetic: "am-mah" },
                { word: "Nanna", meaning: "Father", phonetic: "nan-nah" },
                { word: "Anna", meaning: "Elder Brother", phonetic: "an-nah" },
                { word: "Akka", meaning: "Elder Sister", phonetic: "ak-kah" },
                { word: "Kutumbam", meaning: "Family", phonetic: "koo-toom-bam" }
            ],
            phrases: [
                { prompt: "Say 'My mother'", correct: "Naa amma", meaning: "My mother", hint: "My + mother" },
                { prompt: "Say 'Your father'", correct: "Mee nanna", meaning: "Your father", hint: "Your + father" },
                { prompt: "Say 'This is my family'", correct: "Idhi naa kutumbam", meaning: "This is my family", hint: "This + my + family" }
            ],
            conversations: [
                { prompt: "Introduce your mother to Miko.", correct: "Idhi naa amma", meaning: "This is my mother", hint: "This + my + mother" },
                { prompt: "Ask 'Where is your home?'", correct: "Mee inti ekkada?", meaning: "Where is your home?", hint: "Your + house + where?" },
                { prompt: "Say 'My brother is a good friend'.", correct: "Naa anna manchi snehithudu", meaning: "My brother is a good friend", hint: "My + brother + good + friend" },
                { prompt: "Point to a photo: 'My elder sister'.", correct: "Naa akka", meaning: "My elder sister", hint: "My + sister" }
            ]
        },
        {
            scenario: "Daily Routine",
            vocabulary: [
                { word: "Niddra", meaning: "Sleep", phonetic: "nid-drah" },
                { word: "Snanam", meaning: "Bath", phonetic: "snah-nam" },
                { word: "Pani", meaning: "Work", phonetic: "pah-nee" },
                { word: "Melukonu", meaning: "Wake up", phonetic: "meh-loo-ko-noo" },
                { word: "Vanta", meaning: "Cook", phonetic: "van-tah" }
            ],
            phrases: [
                { prompt: "Say 'I am sleeping'", correct: "Nenu nidra potunnanu", meaning: "I am sleeping", hint: "I + sleep + going" },
                { prompt: "Say 'I want a bath'", correct: "Snanam kaavali", meaning: "I want a bath", hint: "Bath + want" },
                { prompt: "Say 'I am cooking food'", correct: "Nenu annam vanta chestunnanu", meaning: "I am cooking food", hint: "I + food + cook + doing" }
            ],
            conversations: [
                { prompt: "Tell Miko you are waking up now.", correct: "Nenu ippudu melukonnanu", meaning: "I wake up now", hint: "I + now + wake up" },
                { prompt: "Say 'I have work today'.", correct: "Naaku eeroju pani undi", meaning: "I have work today", hint: "Today + I + work" },
                { prompt: "Say 'I will sleep later'.", correct: "Nenu tharuvatha nidra potanu", meaning: "I will sleep later", hint: "I + later + sleep" },
                { prompt: "Ask Miko 'Did you eat?' (simple).", correct: "Meeru thinnara?", meaning: "Did you eat?", hint: "You + ate?" }
            ]
        },
        {
            scenario: "Colors & Clothes",
            vocabulary: [
                { word: "Rangu", meaning: "Color", phonetic: "ran-goo" },
                { word: "Batta", meaning: "Clothes", phonetic: "bat-tah" },
                { word: "Telupu", meaning: "White", phonetic: "teh-loo-poo" },
                { word: "Nalupu", meaning: "Black", phonetic: "nah-loo-poo" },
                { word: "Erupu", meaning: "Red", phonetic: "eh-roo-poo" }
            ],
            phrases: [
                { prompt: "Say 'Red color'", correct: "Erupu rangu", meaning: "Red color", hint: "Red + color" },
                { prompt: "Say 'White clothes'", correct: "Telupu batta", meaning: "White clothes", hint: "White + clothes" },
                { prompt: "Say 'I want black'", correct: "Nalupu kaavali", meaning: "I want black", hint: "Black + want" }
            ],
            conversations: [
                { prompt: "Miko asks your favorite color. Say 'I like red'.", correct: "Naaku erupu ishtam", meaning: "I like red", hint: "My + like + red" },
                { prompt: "Say 'I want new clothes'.", correct: "Kotha batta kaavali", meaning: "New clothes want", hint: "New + clothes + want" },
                { prompt: "Point to a white shirt: 'This is white'.", correct: "Idhi telupu", meaning: "This is white", hint: "This + white" },
                { prompt: "Ask 'Which color is that?' (simple).", correct: "Adhi em rangu?", meaning: "What color is that?", hint: "That + what + color?" }
            ]
        },
        {
            scenario: "Review & Dialogue: Your Day",
            vocabulary: [
                { word: "Eeroju", meaning: "Today", phonetic: "ee-roh-joo" },
                { word: "Baga", meaning: "Well", phonetic: "bah-gah" },
                { word: "Santhosham", meaning: "Happy", phonetic: "san-tho-sham" },
                { word: "Gurthundi", meaning: "Remember", phonetic: "goor-thoon-dee" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" }
            ],
            phrases: [
                { prompt: "Say 'Today was good'", correct: "Eeroju bagundi", meaning: "Today was good", hint: "Today + well" },
                { prompt: "Say 'I am happy today'", correct: "Eeroju nenu santhoshamga unnanu", meaning: "Today I am happy", hint: "Today + I + happy" },
                { prompt: "Say 'I remember you'", correct: "Naaku meeru gurthunnaru", meaning: "I remember you", hint: "You + remember" }
            ],
            conversations: [
                { prompt: "Miko asks about your day. Say 'It was good'.", correct: "Eeroju bagundi", meaning: "Today was good", hint: "Today + well" },
                { prompt: "Tell Miko 'I am going to work now'.", correct: "Nenu ippudu paniki velthunnanu", meaning: "I am going to work now", hint: "I + now + work + going" },
                { prompt: "Say 'Okay, thank you'.", correct: "Sare, dhanyavaadaalu", meaning: "Okay, thank you", hint: "Okay + thanks" },
                { prompt: "Final check: Say hello, I am very happy.", correct: "Namaskaram, nenu chala santhoshamga unnanu", meaning: "Hello, I am very happy", hint: "Hello + I + well + happy" }
            ]
        },

        // Phase 3: The "Connector" Phase (Lessons 21–30)
        {
            scenario: "Postpositions",
            vocabulary: [
                { word: "Lo", meaning: "In", phonetic: "loh", teach: "“In” is {w} — but here is the catch: it goes *after* the noun, not before. Telugu has postpositions, not prepositions." },
                { word: "Paina", meaning: "On/Above", phonetic: "pye-nah", teach: "“On” or “above” is {w}, and like every Telugu postposition it *follows* the noun." },
                { word: "Kindha", meaning: "Under", phonetic: "keen-dhah", teach: "“Under” is {w} — again it comes after the thing it describes, never before it." },
                { word: "Tho", meaning: "With", phonetic: "tho", teach: "“With” is {w}. It hooks onto the end of the word it belongs to." },
                { word: "Daggara", meaning: "Near", phonetic: "dag-gah-rah", teach: "“Near” is {w}, and it comes after the place — the opposite order from English." }
            ],
            phrases: [
                { prompt: "Say 'In the house'", correct: "Inti lo", meaning: "In the house", hint: "House + in" },
                { prompt: "Say 'On the book'", correct: "Pusthakam paina", meaning: "On the book", hint: "Book + on" },
                { prompt: "Say 'With me' (using Tho)", correct: "Naa tho", meaning: "With me", hint: "My + with" }
            ],
            conversations: [
                { prompt: "Miko asks where you are. Say 'I am in the house'.", correct: "Nenu inti lo", meaning: "I am in the house", hint: "I + house + in" },
                { prompt: "Tell someone to sit near you.", correct: "Naa daggara kurchondi", meaning: "Sit near me", hint: "My + near + sit" },
                { prompt: "Tell Miko 'Go with him'.", correct: "Ayana tho vellandi", meaning: "Go with him", hint: "He + with + go" },
                { prompt: "Say 'Under the big tree'.", correct: "Pedda chettu kindha", meaning: "Under big tree", hint: "Big + tree + under" }
            ]
        },
        {
            scenario: "The 'Can' & 'Can't'",
            vocabulary: [
                { word: "Galanu", meaning: "Can", phonetic: "gah-lah-noo", teach: "{w} is an ending rather than a standalone “can”. Add it to a verb stem and it means “I can” — the “I” is already inside it." },
                { word: "Lenu", meaning: "Can't", phonetic: "leh-noo", teach: "{w} is the matching negative ending: add it to a verb stem to say “I can’t”." },
                { word: "Cheyagalanu", meaning: "I can do", phonetic: "cheh-yah-gah-lah-noo", teach: "**Cheyagalanu** is “I can do” — the verb plus *galanu*, with the “I” already inside it." },
                { word: "Matladu", meaning: "Speak", phonetic: "mat-lah-doo" },
                { word: "Sahaayam", meaning: "Help", phonetic: "sah-hah-yam" }
            ],
            phrases: [
                { prompt: "Say 'I can do'", correct: "Nenu cheyagalanu", meaning: "I can do", hint: "I + can do" },
                { prompt: "Say 'I can't go'", correct: "Nenu vellalenu", meaning: "I cannot go", hint: "I + go + cannot" },
                { prompt: "Say 'I can speak Telugu'", correct: "Nenu Telugu matladagalanu", meaning: "I can speak Telugu", hint: "I + Telugu + speak + can" }
            ],
            conversations: [
                { prompt: "Miko asks if you can help. Say 'I can help'.", correct: "Nenu sahaayam cheyagalanu", meaning: "I can help", hint: "I + help + can do" },
                { prompt: "Tell someone 'I can't come today'.", correct: "Eeroju nenu raalenu", meaning: "Today I cannot come", hint: "Today + I + come + cannot" },
                { prompt: "Say 'I can see that'.", correct: "Nenu adhi chudagalanu", meaning: "I can see that", hint: "I + that + see + can" },
                { prompt: "Final check: 'I can't do this now'.", correct: "Nenu ippudu idhi cheyalenu", meaning: "I now this cannot do", hint: "I + now + this + cannot do" }
            ]
        },
        {
            scenario: "Should & Must",
            vocabulary: [
                { word: "Aali", meaning: "(Must suffix)", phonetic: "ah-lee", teach: "{w} is an ending, not a word. Attach it to a verb stem and the verb becomes “must do that”." },
                { word: "Cheyali", meaning: "Must do", phonetic: "cheh-yah-lee" },
                { word: "Vellali", meaning: "Must go", phonetic: "vel-lah-lee" },
                { word: "Thinali", meaning: "Must eat", phonetic: "thee-nah-lee" },
                { word: "Matladali", meaning: "Must speak", phonetic: "mat-lah-dah-lee" }
            ],
            phrases: [
                { prompt: "Say 'I must go'", correct: "Nenu vellali", meaning: "I must go", hint: "I + must go" },
                { prompt: "Say 'I must do work'", correct: "Nenu pani cheyali", meaning: "I must do work", hint: "I + work + must do" },
                { prompt: "Say 'I must speak Telugu'", correct: "Nenu Telugu matladali", meaning: "I must speak Telugu", hint: "I + Telugu + must speak" }
            ],
            conversations: [
                { prompt: "Miko says it's late. Say 'I must go home now'.", correct: "Nenu ippudu intiki vellali", meaning: "I must go home now", hint: "I + now + home + must go" },
                { prompt: "Tell someone 'You must eat food'.", correct: "Meeru annam thinali", meaning: "You must eat food", hint: "You + food + must eat" },
                { prompt: "Say 'I must see Miko today'.", correct: "Eeroju nenu Miko chudali", meaning: "Today I must see Miko", hint: "Today + I + name + must see" },
                { prompt: "Final check: 'I must do this tomorrow'.", correct: "Nenu repu idhi cheyali", meaning: "I must do this tomorrow", hint: "I + tomorrow + this + must do" }
            ]
        },
        {
            scenario: "Conjunctions",
            vocabulary: [
                { word: "Mariyu", meaning: "And", phonetic: "mah-ree-yoo", teach: "“And” is {w} — though be warned: this is bookish. In everyday speech Telugu usually just lists things with no “and” at all." },
                { word: "Kani", meaning: "But", phonetic: "kah-nee" },
                { word: "Endukante", meaning: "Because", phonetic: "en-doo-kan-teh" },
                { word: "Leda", meaning: "Or", phonetic: "leh-dah" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" }
            ],
            phrases: [
                { prompt: "Say 'I want water and food'", correct: "Neeru, annam kaavali", meaning: "Water and food want", hint: "Water + and + food + want" },
                { prompt: "Say 'I want this but not that'", correct: "Idhi kaavali kani adhi oddu", meaning: "I want this but that don't want", hint: "This + want + but + that + don't want" },
                { prompt: "Say 'This or that?'", correct: "Idhi leda adhi?", meaning: "This or that?", hint: "This + or + that?" }
            ],
            conversations: [
                { prompt: "Miko asks what you want. Say 'Coffee and water'.", correct: "Coffee, neeru kaavali", meaning: "Coffee and water want", hint: "Coffee + and + water + want" },
                { prompt: "Say 'I want to go but I have work'.", correct: "Nenu vellali kani naaku pani undi", meaning: "I must go but I have work", hint: "I + go(must) + but + I + work" },
                { prompt: "Say 'Because I'm happy'.", correct: "Endukante nenu santhoshamga unnanu", meaning: "Because I am happy", hint: "Because + I + happy" },
                { prompt: "Final check: 'Rice or bread?' (Annam leda roti?)", correct: "Annam leda roti", meaning: "Rice or bread", hint: "Rice + or + bread" }
            ]
        },
        {
            scenario: "The 'If' Clause",
            vocabulary: [
                { word: "Unte", meaning: "If there is", phonetic: "oon-teh" },
                { word: "Velthe", meaning: "If going", phonetic: "vel-theh" },
                { word: "Thinte", meaning: "If eating", phonetic: "theen-teh" },
                { word: "Chesthe", meaning: "If doing", phonetic: "ches-theh" },
                { word: "Appudu", meaning: "Then", phonetic: "ap-poo-doo" }
            ],
            phrases: [
                { prompt: "Say 'If it is here'", correct: "Ikkada unte", meaning: "If it is here", hint: "Here + if there is" },
                { prompt: "Say 'If you go, then...'", correct: "Meeru velthe appudu", meaning: "If you go then", hint: "You + go(if) + then" },
                { prompt: "Say 'If I do work'", correct: "Nenu pani chesthe", meaning: "If I do work", hint: "I + work + do(if)" }
            ],
            conversations: [
                { prompt: "Tell Miko 'If you are happy, I am happy'.", correct: "Meeru santhoshamga unte, nenu santhoshamga untanu", meaning: "If you are happy I am happy", hint: "You + happy + if + I + happy" },
                { prompt: "Say 'If there is water, I will drink'.", correct: "Neeru unte nenu thaganu", meaning: "If water is there I drink", hint: "Water + if + I + drink" },
                { prompt: "Say 'If you want, take it'.", correct: "Meeku kaavalante theeskondi", meaning: "If you want take", hint: "You + want + if + take" },
                { prompt: "Final check: 'If tomorrow comes...'", correct: "Repu vaste", meaning: "If tomorrow comes", hint: "Tomorrow + if" }
            ]
        },
        {
            scenario: "Feeling Words",
            vocabulary: [
                { word: "Santhosham", meaning: "Happy", phonetic: "san-tho-sham" },
                { word: "Badha", meaning: "Sad", phonetic: "bah-dhah" },
                { word: "Kopam", meaning: "Angry", phonetic: "koh-pam" },
                { word: "Alupu", meaning: "Tired", phonetic: "ah-loo-poo" },
                { word: "Bhayam", meaning: "Scared/Fear", phonetic: "bhah-yam" }
            ],
            phrases: [
                { prompt: "Say 'I am tired'", correct: "Naaku alupuga undi", meaning: "I am tired", hint: "I + tired" },
                { prompt: "Say 'Are you angry?'", correct: "Meeru kopamga unnara?", meaning: "Are you angry?", hint: "You + angry + are?" },
                { prompt: "Say 'Don't be sad'", correct: "Badha padoddu", meaning: "Don't be sad", hint: "Sad + don't" }
            ],
            conversations: [
                { prompt: "Miko asks how you feel. Say 'I am happy'.", correct: "Nenu santhoshamga unnanu", meaning: "I am happy", hint: "I + happy" },
                { prompt: "Tell someone you are not scared.", correct: "Naaku bhayam ledu", meaning: "I have no fear", hint: "I + fear + not" },
                { prompt: "Say 'I am very tired today'.", correct: "Eeroju naaku chala alupuga undi", meaning: "Today I am very tired", hint: "Today + I + well + tired" },
                { prompt: "Point to a sad friend: 'He is sad'.", correct: "Ayana badhaga unnaru", meaning: "He is sad", hint: "He + sad" }
            ]
        },
        {
            scenario: "Advanced Numbers & Money",
            vocabulary: [
                { word: "Dabbulu", meaning: "Money", phonetic: "dab-boo-loo" },
                { word: "Vanda", meaning: "Hundred", phonetic: "van-dah" },
                { word: "Veyi", meaning: "Thousand", phonetic: "veh-yee" },
                { word: "Laksha", meaning: "Lakh", phonetic: "lak-shah" },
                { word: "Chillar", meaning: "Change", phonetic: "chil-lar" }
            ],
            phrases: [
                { prompt: "Say 'Hundred rupees' (Vanda rupayalu)", correct: "Vanda rupayalu", meaning: "100 rupees", hint: "100 + rupees" },
                { prompt: "Say 'I have money'", correct: "Naa daggara dabbulu", meaning: "I have money", hint: "My near + money" },
                { prompt: "Say 'Give change' (Chillar ivvandi)", correct: "Chillar ivvandi", meaning: "Give change", hint: "Change + give" }
            ],
            conversations: [
                { prompt: "Ask the price of something in thousands.", correct: "Veyi rupayalu?", meaning: "1000 rupees?", hint: "Thousand + currency" },
                { prompt: "Tell Miko you don't have change.", correct: "Naa daggara chillar ledu", meaning: "I don't have change", hint: "My near + change + not" },
                { prompt: "Say 'That costs one lakh'.", correct: "Adhi oka laksha", meaning: "That is 1 lakh", hint: "That + one + lakh" },
                { prompt: "Ask 'Do you have money?'", correct: "Mee daggara dabbulu unnaya?", meaning: "Do you have money?", hint: "Your near + money + are?" }
            ]
        },
        {
            scenario: "Weather & Travel",
            vocabulary: [
                { word: "Enda", meaning: "Heat/Sun", phonetic: "en-dah" },
                { word: "Prayanam", meaning: "Trip/Travel", phonetic: "prah-yah-nam" },
                { word: "Ticketu", meaning: "Ticket", phonetic: "tik-keh-too" },
                { word: "Bus", meaning: "Bus", phonetic: "bus" },
                { word: "Vellandi", meaning: "Go (polite)", phonetic: "vel-lan-dee", teach: "A polite “please go” is {w}. Same -andi ending again." }
            ],
            phrases: [
                { prompt: "Say 'It's very hot today' (Eeroju chala enda)", correct: "Eeroju chala enda", meaning: "Today very hot", hint: "Today + well + heat" },
                { prompt: "Say 'I want a bus ticket'", correct: "Bus ticketu kaavali", meaning: "I want a bus ticket", hint: "Bus + ticket + want" },
                { prompt: "Say 'Safe trip' (Manchi prayanam)", correct: "Manchi prayanam", meaning: "Good trip", hint: "Good + trip" }
            ],
            conversations: [
                { prompt: "Miko asks about the weather. Say 'It is raining' (Vana paduthundi).", correct: "Vana paduthundi", meaning: "Rain is falling", hint: "Rain + falling" },
                { prompt: "Ask someone 'Where is the bus?'", correct: "Bus ekkada?", meaning: "Where is the bus?", hint: "Bus + where?" },
                { prompt: "Say 'I am going on a trip tomorrow'.", correct: "Repu nenu prayanam velthunnanu", meaning: "Tomorrow I trip going", hint: "Tomorrow + I + trip + going" },
                { prompt: "Final check: 'Hot weather today'.", correct: "Eeroju vaathavaranam chala vediga undi", meaning: "Today hot weather", hint: "Today + heat + weather" }
            ]
        },
        {
            scenario: "Slang & Fillers",
            vocabulary: [
                { word: "Kada", meaning: "Right?", phonetic: "kah-dah" },
                { word: "Chudu", meaning: "Look/See", phonetic: "choo-doo" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" },
                { word: "Adhi", meaning: "That/Um", phonetic: "ah-dhee", teach: "Telugu’s filler — the “um…” you stall with — is {w}. Same word as “that”, doing a completely different job." },
                { word: "Avunu", meaning: "Yes", phonetic: "ah-voo-noo" }
            ],
            phrases: [
                { prompt: "Say 'It's good, right?'", correct: "Manchi, kada?", meaning: "Good, right?", hint: "Good + right?" },
                { prompt: "Say 'Look there!'", correct: "Akkada chudu!", meaning: "Look there!", hint: "There + look" },
                { prompt: "Say 'Okay, I agree'", correct: "Sare, avunu", meaning: "Okay, yes", hint: "Okay + yes" }
            ],
            conversations: [
                { prompt: "Miko says something. Respond with 'Right?' (Kada?)", correct: "Kada?", meaning: "Right?", hint: "Filler word" },
                { prompt: "Point to Miko: 'Look at Miko!'", correct: "Miko chudu!", meaning: "See Miko!", hint: "Name + look" },
                { prompt: "Say 'Okay okay' (Sare sare).", correct: "Sare sare", meaning: "Okay okay", hint: "Double filler" },
                { prompt: "Confirm: 'Yes, it is big, right?'.", correct: "Avunu, idhi pedda, kada?", meaning: "Yes, this is big, right?", hint: "Yes + this + big + right?" }
            ]
        },
        {
            scenario: "Final Capstone",
            vocabulary: [
                { word: "Perigaanu", meaning: "I grew up", phonetic: "peh-ree-gah-noo" },
                { word: "Matladagalanu", meaning: "I can speak", phonetic: "mat-lah-dah-gah-lah-noo" },
                { word: "Santhoshamga", meaning: "Happily", phonetic: "san-tho-sham-gah" },
                { word: "Telugu", meaning: "Telugu", phonetic: "teh-loo-goo" },
                { word: "Nenu", meaning: "I", phonetic: "neh-noo" }
            ],
            phrases: [
                { prompt: "Say 'I can speak Telugu'", correct: "Nenu Telugu matladagalanu", meaning: "I can speak Telugu", hint: "I + Telugu + speak + can" },
                { prompt: "Say 'I am speaking happily'", correct: "Nenu santhoshamga matladuthunnanu", meaning: "I happily speaking", hint: "I + happily + speaking" },
                { prompt: "Say 'This is my last one' (Idhi naa aakhari)", correct: "Idhi naa aakhari", meaning: "This is my final", hint: "This + my + final" }
            ],
            conversations: [
                { prompt: "Tell Miko your full story: 'Hello, I am Ravi, I can speak Telugu.'", correct: "Namaskaram, nenu Ravi, nenu Telugu matladagalanu", meaning: "Hello, I am Ravi, I can speak Telugu", hint: "Greeting + I + Name + I + Telugu + speak can" },
                { prompt: "Say 'I am very happy today'.", correct: "Eeroju nenu chala santhoshamga unnanu", meaning: "Today I am very happy", hint: "Today + I + well + happy" },
                { prompt: "Tell someone 'I am from Hyderabad and I grew up there'.", correct: "Nenu Hyderabad nundi, nenu akkada perigaanu", meaning: "I from Hyderabad, I there grew up", hint: "I [city] from, I there grew up" },
                { prompt: "Final Check: 'Now, I can speak Telugu nicely!'.", correct: "Ippudu nenu Telugu baga matladagalanu", meaning: "Now I can speak Telugu nicely", hint: "Now + I + Telugu + well + speak can" }
            ]
        }
    ],
    Kannada: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaskara", meaning: "Hello", phonetic: "nah-mas-kah-rah" },
                { word: "Naanu", meaning: "I", phonetic: "nah-noo" },
                { word: "Neevu", meaning: "You", phonetic: "nee-voo" },
                { word: "Chennagiddini", meaning: "I am fine", phonetic: "chen-nah-geed-dee-nee", teach: "**Chennagiddini** is a whole sentence: “I am fine”. The -ini ending is the “I” — for “you are fine” it becomes *chennagiddeera*." },
                { word: "Hege", meaning: "How", phonetic: "heh-geh", teach: "“How” is {w}. It sits just before the verb, not at the front like English." },
                { word: "Iddeera", meaning: "Are (you) - polite", phonetic: "id-dee-rah", teach: "{w} means “are you”, the polite verb that *completes* a question like “how are you”. It is never used by itself." }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskara, naanu chennagiddini", meaning: "Hello, I am fine", hint: "Hello + I + fine" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Neevu hege iddeera?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Naanu chennagiddini, neevu?", meaning: "I am fine, and you?", hint: "I + fine + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskara, naanu chennagiddini", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, neevu hege iddeera?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Neevu hege iddeera?'. Answer 'Naanu chennagiddini'.", correct: "Naanu chennagiddini", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaskara, naanu chennagiddini, neevu hege iddeera?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Idu", meaning: "This", phonetic: "ee-doo", teach: "“This” is {w}, and it comes *before* the thing you are pointing at." },
                { word: "Adu", meaning: "That", phonetic: "ah-doo", teach: "“That” is {w} — for something further off, and also before the noun." },
                { word: "Yenu", meaning: "What", phonetic: "yeh-noo", teach: "“What” on its own is {w}. Kannada puts the question word at the *end*, after whatever you are asking about." },
                { word: "Pustaka", meaning: "Book", phonetic: "poos-tah-kah" },
                { word: "Hesaru", meaning: "Name", phonetic: "heh-sah-roo" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Idu yenu?", meaning: "What is this?", hint: "This + what?" },
                { prompt: "Say 'This is a book'", correct: "Idu pustaka", meaning: "This is a book", hint: "This + book" },
                { prompt: "Ask 'What is that?'", correct: "Adu yenu?", meaning: "What is that?", hint: "That + what?" }
            ],
            conversations: [
                { prompt: "Someone points to a book. Ask them what it is.", correct: "Idu yenu?", meaning: "What is this?", hint: "Question for item" },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Adu yenu?", meaning: "What is that?", hint: "Distant question" },
                { prompt: "Tell Miko 'This is my book' (using Idu pustaka)", correct: "Idu pustaka", meaning: "This is a book", hint: "Simple statement" },
                { prompt: "Ask 'What is your name?'", correct: "Nimma hesaru yenu?", meaning: "What is your name?", hint: "Your(Nimma) + name + what?" }
            ]
        },
        {
            scenario: "The 'Where' & 'Going'",
            vocabulary: [
                { word: "Yelli", meaning: "Where", phonetic: "yel-lee", teach: "“Where” is {w}, and it goes at the end of the sentence rather than the start." },
                { word: "Hogu", meaning: "Go", phonetic: "hoh-goo" },
                { word: "Illi", meaning: "Here", phonetic: "eel-lee" },
                { word: "Alli", meaning: "There", phonetic: "al-lee" },
                { word: "Mane", meaning: "Home/House", phonetic: "mah-neh" }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Mane yelli?", meaning: "Where is the house?", hint: "House + where?" },
                { prompt: "Say 'Go there'", correct: "Alli hogu", meaning: "Go there", hint: "There + go" },
                { prompt: "Say 'I am here'", correct: "Naanu illi", meaning: "I am here", hint: "I + here" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Mane yelli?", meaning: "Where is the home?", hint: "Location question" },
                { prompt: "Tell someone to go here.", correct: "Illi hogu", meaning: "Go here", hint: "Direction" },
                { prompt: "Someone asks 'Neevu yelli?'. Answer 'I am here'.", correct: "Naanu illi", meaning: "I am here", hint: "Response" },
                { prompt: "Final Check: Say 'I am going home'.", correct: "Naanu manege hogu", meaning: "I go home", hint: "I + home + go" }
            ]
        },
        {
            scenario: "Desires & Negation",
            vocabulary: [
                { word: "Beku", meaning: "Want", phonetic: "beh-koo" },
                { word: "Beda", meaning: "Don't want", phonetic: "beh-dah" },
                { word: "Oota", meaning: "Food", phonetic: "oo-tah" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-roo" },
                { word: "Haudu", meaning: "Yes", phonetic: "how-doo" },
                { word: "Illa", meaning: "No / not", phonetic: "il-lah", teach: "“No” is {w}. It also serves as “not” and “isn’t”, and it goes at the end." },
                { word: "Sari", meaning: "Okay / correct", phonetic: "sah-ree" }
            ],
            phrases: [
                { prompt: "Say 'I want water'", correct: "Neeru beku", meaning: "I want water", hint: "Water + want" },
                { prompt: "Say 'I don't want food'", correct: "Oota beda", meaning: "I don't want food", hint: "Food + don't want" },
                { prompt: "Say 'Okay, I want this'", correct: "Sari, idu beku", meaning: "Okay, I want this", hint: "Okay + this + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Say 'Yes, I want water'.", correct: "Haudu, neeru beku", meaning: "Yes, I want water", hint: "Yes + water + want" },
                { prompt: "Someone offers you food you don't like. Say 'No, I don't want'.", correct: "Illa, oota beda", meaning: "No, I don't want food", hint: "No + food + don't want" },
                { prompt: "Ask for 'this book' saying 'I want this book'.", correct: "Idu pustaka beku", meaning: "I want this book", hint: "This + book + want" },
                { prompt: "Say 'I don't want that'.", correct: "Adu beda", meaning: "That + don't want", hint: "That + don't want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Nanna", meaning: "My", phonetic: "nan-nah" },
                { word: "Nimma", meaning: "Your", phonetic: "neem-mah" },
                { word: "Avara", meaning: "His/Her (formal)", phonetic: "ah-vah-rah", teach: "{w} is a respectful “his” or “her”. Kannada makes no gender distinction in the formal form." },
                { word: "Aatana", meaning: "His", phonetic: "ah-tah-nah" },
                { word: "Kathey", meaning: "Story", phonetic: "kah-theh" }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Nanna hesaru", meaning: "My name", hint: "My + name" },
                { prompt: "Say 'Your book'", correct: "Nimma pustaka", meaning: "Your book", hint: "Your + book" },
                { prompt: "Say 'His story'", correct: "Aatana kathey", meaning: "His story", hint: "His + story" }
            ],
            conversations: [
                { prompt: "Introduce yourself: 'Hello, my name is Ravi'.", correct: "Namaskara, nanna hesaru Ravi", meaning: "Hello, my name is Ravi", hint: "Greeting + My + Name" },
                { prompt: "Identify a book as 'your book'.", correct: "Adu nimma pustaka", meaning: "That is your book", hint: "That + your + book" },
                { prompt: "Say 'This is my story'.", correct: "Idu nanna kathey", meaning: "This is my story", hint: "This + my + story" },
                { prompt: "Point to a teacher and say 'Her name' (formal).", correct: "Avara hesaru", meaning: "Her name", hint: "Formal her + name" }
            ]
        },
        {
            scenario: "The 'Who'",
            icon: "🧑",
            color: "#ede9fe",
            vocabulary: [
                { word: "Yaaru", meaning: "Who", phonetic: "yaa-roo", teach: "“Who” is {w} — again, at the end of the question." },
                { word: "Ivaru", meaning: "This person (polite)", phonetic: "ee-vah-roo", teach: "{w} is “this person”, the polite way to refer to someone present — safer than pointing." },
                { word: "Snehita", meaning: "Friend", phonetic: "sneh-hee-tah" },
                { word: "Shikshaka", meaning: "Teacher", phonetic: "shik-shah-kah" },
                { word: "Akka", meaning: "Elder sister", phonetic: "ak-kah" }
            ],
            phrases: [
                { prompt: "Ask 'Who is this?'", correct: "Ivaru yaaru?", meaning: "Who is this?", hint: "This person + who?" },
                { prompt: "Say 'This is my friend'", correct: "Ivaru nanna snehita", meaning: "This is my friend", hint: "This person + my + friend" },
                { prompt: "Say 'She is my elder sister'", correct: "Ivaru nanna akka", meaning: "She is my elder sister", hint: "This person + my + sister" }
            ],
            conversations: [
                { prompt: "Someone points at a person. Ask who they are.", correct: "Ivaru yaaru?", meaning: "Who is this?", hint: "This person + who?" },
                { prompt: "Tell Miko this person is your teacher.", correct: "Ivaru nanna shikshaka", meaning: "This is my teacher", hint: "This person + my + teacher" },
                { prompt: "Introduce your friend to Miko.", correct: "Ivaru nanna snehita", meaning: "This is my friend", hint: "This person + my + friend" },
                { prompt: "Ask who the teacher is.", correct: "Shikshaka yaaru?", meaning: "Who is the teacher?", hint: "Teacher + who?" }
            ]
        },
        {
            scenario: "Basic Numbers",
            icon: "🔢",
            color: "#e0f2fe",
            vocabulary: [
                { word: "Ondu", meaning: "One", phonetic: "on-doo" },
                { word: "Eradu", meaning: "Two", phonetic: "eh-rah-doo" },
                { word: "Mooru", meaning: "Three", phonetic: "moo-roo" },
                { word: "Naalku", meaning: "Four", phonetic: "naal-koo" },
                { word: "Aidu", meaning: "Five", phonetic: "eye-doo" }
            ],
            phrases: [
                { prompt: "Count from one to three", correct: "Ondu, eradu, mooru", meaning: "One, two, three", hint: "Count up" },
                { prompt: "Say 'two books'", correct: "Eradu pustaka", meaning: "Two books", hint: "Two + book" },
                { prompt: "Say 'five houses'", correct: "Aidu mane", meaning: "Five houses", hint: "Five + house" }
            ],
            conversations: [
                { prompt: "Miko asks how many books you have. Say three.", correct: "Mooru pustaka", meaning: "Three books", hint: "Three + book" },
                { prompt: "Count all the way from one to five.", correct: "Ondu, eradu, mooru, naalku, aidu", meaning: "One to five", hint: "Full count" },
                { prompt: "Say 'four friends'", correct: "Naalku snehita", meaning: "Four friends", hint: "Four + friend" },
                { prompt: "Ask for two waters.", correct: "Eradu neeru beku", meaning: "Two waters wanted", hint: "Two + water + want" }
            ]
        },
        {
            scenario: "Plurals",
            icon: "📚",
            color: "#dcfce7",
            vocabulary: [
                { word: "Galu", meaning: "(Plural suffix)", phonetic: "gah-loo", teach: "{w} is not a standalone word — it is the *ending* you attach to a noun to make it plural." },
                { word: "Pustakagalu", meaning: "Books", phonetic: "poos-tah-kah-gah-loo" },
                { word: "Snehitaru", meaning: "Friends", phonetic: "sneh-hee-tah-roo" },
                { word: "Manegalu", meaning: "Houses", phonetic: "mah-neh-gah-loo" },
                { word: "Hoovugalu", meaning: "Flowers", phonetic: "hoo-voo-gah-loo" }
            ],
            phrases: [
                { prompt: "Say 'three books'", correct: "Mooru pustakagalu", meaning: "Three books", hint: "Three + books" },
                { prompt: "Say 'my friends'", correct: "Nanna snehitaru", meaning: "My friends", hint: "My + friends" },
                { prompt: "Say 'two houses'", correct: "Eradu manegalu", meaning: "Two houses", hint: "Two + houses" }
            ],
            conversations: [
                { prompt: "Tell Miko you have four friends.", correct: "Nanna naalku snehitaru", meaning: "My four friends", hint: "My + four + friends" },
                { prompt: "Say 'five books'", correct: "Aidu pustakagalu", meaning: "Five books", hint: "Five + books" },
                { prompt: "Tell Miko you want flowers.", correct: "Hoovugalu beku", meaning: "Flowers wanted", hint: "Flowers + want" },
                { prompt: "Say 'my books'", correct: "Nanna pustakagalu", meaning: "My books", hint: "My + books" }
            ]
        },
        {
            scenario: "Basic Adjectives",
            icon: "🎨",
            color: "#fef3c7",
            vocabulary: [
                { word: "Dodda", meaning: "Big", phonetic: "dod-dah" },
                { word: "Chikka", meaning: "Small", phonetic: "chik-kah" },
                { word: "Olleya", meaning: "Good", phonetic: "ol-leh-yah" },
                { word: "Ketta", meaning: "Bad", phonetic: "ket-tah" },
                { word: "Bisi", meaning: "Hot", phonetic: "bee-see" }
            ],
            phrases: [
                { prompt: "Say 'a big house'", correct: "Dodda mane", meaning: "A big house", hint: "Big + house" },
                { prompt: "Say 'good food'", correct: "Olleya oota", meaning: "Good food", hint: "Good + food" },
                { prompt: "Say 'hot water'", correct: "Bisi neeru", meaning: "Hot water", hint: "Hot + water" }
            ],
            conversations: [
                { prompt: "Describe your house as small.", correct: "Nanna mane chikka", meaning: "My house is small", hint: "My + house + small" },
                { prompt: "Tell Miko the food is good.", correct: "Oota olleya", meaning: "The food is good", hint: "Food + good" },
                { prompt: "Say 'this is a big book'", correct: "Idu dodda pustaka", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Ask for hot water.", correct: "Bisi neeru beku", meaning: "Hot water wanted", hint: "Hot + water + want" }
            ]
        },
        {
            scenario: "Review & Survival Dialogue",
            icon: "🍽️",
            color: "#fce7f3",
            vocabulary: [
                { word: "Lekka", meaning: "Bill / account", phonetic: "lek-kah" },
                { word: "Kodi", meaning: "Give (please)", phonetic: "koh-dee", teach: "A polite “please give” is {w} — that -i ending is the polite command form." },
                { word: "Dhanyavada", meaning: "Thank you", phonetic: "dhahn-yah-vah-dah" },
                { word: "Estu", meaning: "How much", phonetic: "es-too" },
                { word: "Kshamisi", meaning: "Sorry / excuse me", phonetic: "ksha-mee-see" }
            ],
            phrases: [
                { prompt: "Ask 'How much?'", correct: "Estu?", meaning: "How much?", hint: "How much?" },
                { prompt: "Ask for the bill", correct: "Lekka kodi", meaning: "Give the bill", hint: "Bill + give" },
                { prompt: "Say thank you", correct: "Dhanyavada", meaning: "Thank you", hint: "One word" }
            ],
            conversations: [
                { prompt: "You have finished eating. Ask for the bill.", correct: "Lekka kodi", meaning: "Give the bill", hint: "Bill + give" },
                { prompt: "Ask how much the book costs.", correct: "Pustaka estu?", meaning: "How much is the book?", hint: "Book + how much?" },
                { prompt: "Thank Miko warmly.", correct: "Dhanyavada Miko", meaning: "Thank you Miko", hint: "Thanks + name" },
                { prompt: "Excuse yourself, then ask for water.", correct: "Kshamisi, neeru kodi", meaning: "Excuse me, give water", hint: "Sorry + water + give" }
            ]
        }
    ],
    Hindi: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaste", meaning: "Hello", phonetic: "nah-mas-tey" },
                { word: "Main", meaning: "I", phonetic: "mayn" },
                { word: "Aap", meaning: "You", phonetic: "ahp" },
                { word: "Theek", meaning: "Fine", phonetic: "theek" },
                { word: "Kaise", meaning: "How", phonetic: "kay-say" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaste, main theek hoon", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Aap kaise hain?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Main theek hoon, aap?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaste, main theek hoon", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, aap kaise hain?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Aap kaise hain?'. Answer 'Main theek hoon'.", correct: "Main theek hoon", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaste, main theek hoon, aap kaise hain?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Yeh", meaning: "This", phonetic: "yeh" },
                { word: "Woh", meaning: "That", phonetic: "voh" },
                { word: "Kya", meaning: "What", phonetic: "kyah" },
                { word: "Kitab", meaning: "Book", phonetic: "kee-tahb" },
                { word: "Naam", meaning: "Name", phonetic: "nahm" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Yeh kya hai?", meaning: "What is this?", hint: "This + what + is?" },
                { prompt: "Say 'This is a book'", correct: "Yeh kitab hai", meaning: "This is a book", hint: "This + book + is" },
                { prompt: "Ask 'What is that?'", correct: "Woh kya hai?", meaning: "What is that?", hint: "That + what + is?" }
            ],
            conversations: [
                { prompt: "Someone points to a book. Ask them what it is.", correct: "Yeh kya hai?", meaning: "What is this?", hint: "Question for item" },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Woh kya hai?", meaning: "What is that?", hint: "Distant question" },
                { prompt: "Tell Miko 'This is my book' (using Yeh kitab hai)", correct: "Yeh kitab hai", meaning: "This is a book", hint: "Simple statement" },
                { prompt: "Ask 'What is your name?'", correct: "Aapka naam kya hai?", meaning: "What is your name?", hint: "Your(Aapka) + name + what + is?" }
            ]
        },
        {
            scenario: "The 'Where' & 'Going'",
            vocabulary: [
                { word: "Kahan", meaning: "Where", phonetic: "kah-hahn" },
                { word: "Chalo", meaning: "Go", phonetic: "chah-loh" },
                { word: "Yahan", meaning: "Here", phonetic: "yah-hahn" },
                { word: "Wahan", meaning: "There", phonetic: "vah-hahn" },
                { word: "Ghar", meaning: "Home/House", phonetic: "ghahr" }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Ghar kahan hai?", meaning: "Where is the house?", hint: "House + where + is?" },
                { prompt: "Say 'Go there'", correct: "Wahan chalo", meaning: "Go there", hint: "There + go" },
                { prompt: "Say 'I am here'", correct: "Main yahan hoon", meaning: "I am here", hint: "I + here + am" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Ghar kahan hai?", meaning: "Where is the home?", hint: "Location question" },
                { prompt: "Tell someone to go here.", correct: "Yahan chalo", meaning: "Go here", hint: "Direction" },
                { prompt: "Someone asks 'Aap kahan hain?'. Answer 'I am here'.", correct: "Main yahan hoon", meaning: "I am here", hint: "Response" },
                { prompt: "Final Check: Say 'I am going home'.", correct: "Main ghar ja raha hoon", meaning: "I go home", hint: "I + home + going + am" }
            ]
        },
        {
            scenario: "Desires & Negation",
            vocabulary: [
                { word: "Chahiye", meaning: "Want", phonetic: "chah-hee-yay" },
                { word: "Nahin", meaning: "No/Not", phonetic: "nah-heen" },
                { word: "Khana", meaning: "Food", phonetic: "khah-nah" },
                { word: "Paani", meaning: "Water", phonetic: "pah-nee" },
                { word: "Theek", meaning: "Okay/Fine", phonetic: "theek" }
            ],
            phrases: [
                { prompt: "Say 'I want water'", correct: "Paani chahiye", meaning: "Water want", hint: "Water + want" },
                { prompt: "Say 'I don't want food'", correct: "Khana nahin chahiye", meaning: "Food not want", hint: "Food + not + want" },
                { prompt: "Say 'Okay, I want this'", correct: "Theek hai, yeh chahiye", meaning: "Okay, I want this", hint: "Okay + this + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Say 'Yes, I want water'.", correct: "Haan, paani chahiye", meaning: "Yes, I want water", hint: "Yes + water + want" },
                { prompt: "Someone offers you food you don't like. Say 'No, I don't want'.", correct: "Nahin, khana nahin chahiye", meaning: "No, I don't want food", hint: "No + food + not + want" },
                { prompt: "Ask for 'this book' saying 'I want this book'.", correct: "Yeh kitab chahiye", meaning: "I want this book", hint: "This + book + want" },
                { prompt: "Say 'I don't want that'.", correct: "Woh nahin chahiye", meaning: "That not want", hint: "That + not + want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Mera", meaning: "My", phonetic: "meh-rah" },
                { word: "Aapka", meaning: "Your", phonetic: "ahp-kah" },
                { word: "Unka", meaning: "His/Her", phonetic: "oon-kah" },
                { word: "Uski", meaning: "His/Her (informal)", phonetic: "oos-kee" },
                { word: "Kahani", meaning: "Story", phonetic: "kah-hah-nee" }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Mera naam", meaning: "My name", hint: "My + name" },
                { prompt: "Say 'Your book'", correct: "Aapka kitab", meaning: "Your book", hint: "Your + book" },
                { prompt: "Say 'His story'", correct: "Unki kahani", meaning: "His story", hint: "His + story" }
            ],
            conversations: [
                { prompt: "Introduce yourself: 'Hello, my name is Ravi'.", correct: "Namaste, mera naam Ravi hai", meaning: "Hello, my name is Ravi", hint: "Greeting + My + Name + is" },
                { prompt: "Identify a book as 'your book'.", correct: "Woh aapka kitab hai", meaning: "That is your book", hint: "That + your + book + is" },
                { prompt: "Say 'This is my story'.", correct: "Yeh meri kahani hai", meaning: "This is my story", hint: "This + my + story + is" },
                { prompt: "Ask 'What is his name?'.", correct: "Unka naam kya hai?", meaning: "What is his name?", hint: "His + name + what + is?" }
            ]
        }
    ],
    Odiya: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaskara", meaning: "Hello", phonetic: "nuh-muh-skuh-ruh" },
                { word: "Mu", meaning: "I", phonetic: "moo" },
                { word: "Apana", meaning: "You", phonetic: "ah-pun-uh" },
                { word: "Bhala", meaning: "Fine", phonetic: "bhuh-luh" },
                { word: "Kemiti", meaning: "How", phonetic: "keh-mee-tee" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskara, mu bhala", meaning: "Hello, I am fine", hint: "Hello + I + fine" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Apana kemiti achhanti?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Mu bhala, apana?", meaning: "I am fine, and you?", hint: "I + fine + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskara, mu bhala", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, apana kemiti achhanti?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Apana kemiti achhanti?'. Answer 'Mu bhala'.", correct: "Mu bhala", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaskara, mu bhala, apana kemiti achhanti?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Eha", meaning: "This", phonetic: "eh-hah" },
                { word: "Sehi", meaning: "That", phonetic: "seh-hee" },
                { word: "Kana", meaning: "What", phonetic: "kuh-nuh" },
                { word: "Bahi", meaning: "Book", phonetic: "buh-hee" },
                { word: "Nama", meaning: "Name", phonetic: "nah-muh" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Eha kana?", meaning: "What is this?", hint: "This + what?" },
                { prompt: "Say 'This is a book'", correct: "Eha bahi", meaning: "This is a book", hint: "This + book" },
                { prompt: "Ask 'What is that?'", correct: "Sehi kana?", meaning: "What is that?", hint: "That + what?" }
            ],
            conversations: [
                { prompt: "Someone points to a book. Ask them what it is.", correct: "Eha kana?", meaning: "What is this?", hint: "Question for item" },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Sehi kana?", meaning: "What is that?", hint: "Distant question" },
                { prompt: "Tell Miko 'This is my book' (using Eha bahi)", correct: "Eha bahi", meaning: "This is a book", hint: "Simple statement" },
                { prompt: "Ask 'What is your name?'", correct: "Apana nka nama kana?", meaning: "What is your name?", hint: "Your + name + what?" }
            ]
        },
        {
            scenario: "The 'Where' & 'Going'",
            vocabulary: [
                { word: "Kouthi", meaning: "Where", phonetic: "kow-thee" },
                { word: "Jaantu", meaning: "Go", phonetic: "jahn-too" },
                { word: "Ethi", meaning: "Here", phonetic: "eh-thee" },
                { word: "Sethi", meaning: "There", phonetic: "seh-thee" },
                { word: "Ghara", meaning: "Home/House", phonetic: "guh-ruh" }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Ghara kouthi?", meaning: "Where is the house?", hint: "House + where?" },
                { prompt: "Say 'Go there'", correct: "Sethi jaantu", meaning: "Go there", hint: "There + go" },
                { prompt: "Say 'I am here'", correct: "Mu ethi achhi", meaning: "I am here", hint: "I + here + am" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Ghara kouthi?", meaning: "Where is the home?", hint: "Location question" },
                { prompt: "Tell someone to go here.", correct: "Ethi jaantu", meaning: "Go here", hint: "Direction" },
                { prompt: "Someone asks 'Apana kouthi?'. Answer 'I am here'.", correct: "Mu ethi achhi", meaning: "I am here", hint: "Response" },
                { prompt: "Final Check: Say 'I am going home'.", correct: "Mu ghara ku jauchhi", meaning: "I go home", hint: "I + home + going" }
            ]
        },
        {
            scenario: "Desires & Negation",
            vocabulary: [
                { word: "Darakara", meaning: "Want", phonetic: "duh-ruh-kuh-ruh" },
                { word: "Darakara nahi", meaning: "Don't want", phonetic: "duh-ruh-kuh-ruh nah-hee" },
                { word: "Khana", meaning: "Food", phonetic: "khah-nuh" },
                { word: "Pani", meaning: "Water", phonetic: "pah-nee" },
                { word: "Hela", meaning: "Okay", phonetic: "heh-lah" }
            ],
            phrases: [
                { prompt: "Say 'I want water'", correct: "Pani darakara", meaning: "I want water", hint: "Water + want" },
                { prompt: "Say 'I don't want food'", correct: "Khana darakara nahi", meaning: "I don't want food", hint: "Food + don't want" },
                { prompt: "Say 'Okay, I want this'", correct: "Hela, eha darakara", meaning: "Okay, I want this", hint: "Okay + this + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Say 'Yes, I want water'.", correct: "Han, pani darakara", meaning: "Yes, I want water", hint: "Yes + water + want" },
                { prompt: "Someone offers you food you don't like. Say 'No, I don't want'.", correct: "Na, khana darakara nahi", meaning: "No, I don't want food", hint: "No + food + don't want" },
                { prompt: "Ask for 'this book' saying 'I want this book'.", correct: "Eha bahi darakara", meaning: "I want this book", hint: "This + book + want" },
                { prompt: "Say 'I don't want that'.", correct: "Sehi darakara nahi", meaning: "That + don't want", hint: "That + don't want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Mora", meaning: "My", phonetic: "mo-ruh" },
                { word: "Apana nka", meaning: "Your", phonetic: "ah-pun-uh-nkuh" },
                { word: "Tanka", meaning: "His/Her", phonetic: "tun-kuh" },
                { word: "Seta", meaning: "Its", phonetic: "seh-tah" },
                { word: "Gapa", meaning: "Story", phonetic: "guh-puh" }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Mora nama", meaning: "My name", hint: "My + name" },
                { prompt: "Say 'Your book'", correct: "Apana nka bahi", meaning: "Your book", hint: "Your + book" },
                { prompt: "Say 'His story'", correct: "Tanka gapa", meaning: "His story", hint: "His + story" }
            ],
            conversations: [
                { prompt: "Introduce yourself: 'Hello, my name is Ravi'.", correct: "Namaskara, mora nama Ravi", meaning: "Hello, my name is Ravi", hint: "Greeting + My + Name" },
                { prompt: "Identify a book as 'your book'.", correct: "Sehi apana nka bahi", meaning: "That is your book", hint: "That + your + book" },
                { prompt: "Say 'This is my story'.", correct: "Eha mora gapa", meaning: "This is my story", hint: "This + my + story" },
                { prompt: "Point to a teacher and say 'Her name'.", correct: "Tanka nama", meaning: "Her name", hint: "Her + name" }
            ]
        },
        {
            scenario: "The 'Who'",
            vocabulary: [
                { word: "Ke", meaning: "Who", phonetic: "keh" },
                { word: "Bandhu", meaning: "Friend", phonetic: "bun-dhoo" },
                { word: "Shikshaka", meaning: "Teacher", phonetic: "shik-shah-kuh" },
                { word: "Bhai", meaning: "Brother", phonetic: "bhy" },
                { word: "Bhauni", meaning: "Sister", phonetic: "bhow-nee" }
            ],
            phrases: [
                { prompt: "Ask 'Who is this?'", correct: "Eha ke?", meaning: "Who is this?", hint: "This + who?" },
                { prompt: "Say 'He is my friend'", correct: "Se mora bandhu", meaning: "He is my friend", hint: "He + my + friend" },
                { prompt: "Ask 'Who are you?'", correct: "Apana ke?", meaning: "Who are you?", hint: "You + who?" }
            ],
            conversations: [
                { prompt: "Someone knocks. Ask 'Who is it?'", correct: "Ke?", meaning: "Who?", hint: "Short question" },
                { prompt: "Introduce Miko as your friend.", correct: "Miko mora bandhu", meaning: "Miko is my friend", hint: "Name + my + friend" },
                { prompt: "Point to your teacher and say 'He is my teacher'.", correct: "Se mora shikshaka", meaning: "He is my teacher", hint: "He + my + teacher" },
                { prompt: "Ask 'Who is your brother?'", correct: "Apana nka bhai ke?", meaning: "Who is your brother?", hint: "Your + brother + who?" }
            ]
        },
        {
            scenario: "Basic Numbers",
            vocabulary: [
                { word: "Eka", meaning: "One", phonetic: "eh-kuh" },
                { word: "Dui", meaning: "Two", phonetic: "doo-ee" },
                { word: "Tini", meaning: "Three", phonetic: "tee-nee" },
                { word: "Chari", meaning: "Four", phonetic: "chah-ree" },
                { word: "Pancha", meaning: "Five", phonetic: "pun-chuh" }
            ],
            phrases: [
                { prompt: "Say 'One book'", correct: "Eka bahi", meaning: "One book", hint: "One + book" },
                { prompt: "Say 'Two friends'", correct: "Dui bandhu", meaning: "Two friends", hint: "Two + friends" },
                { prompt: "Say 'Five houses'", correct: "Pancha ghara", meaning: "Five houses", hint: "Five + houses" }
            ],
            conversations: [
                { prompt: "Miko asks how many books. Say 'Three books'.", correct: "Tini bahi", meaning: "Three books", hint: "Three + books" },
                { prompt: "Say 'I want two' (using Dui darakara).", correct: "Dui darakara", meaning: "I want two", hint: "Number + want" },
                { prompt: "Tell Miko 'I have one sister' (using Mora bhauni eka).", correct: "Mora bhauni eka", meaning: "My sister one", hint: "My + sister + number" },
                { prompt: "Count 1, 2, 3.", correct: "Eka, dui, tini", meaning: "1, 2, 3", hint: "Consecutive" }
            ]
        },
        {
            scenario: "Plurals",
            vocabulary: [
                { word: "Mane", meaning: "(People plural suffix)", phonetic: "mah-neh" },
                { word: "Guda", meaning: "(Things plural suffix)", phonetic: "goo-dah" },
                { word: "Bahiguda", meaning: "Books", phonetic: "buh-hee-goo-dah" },
                { word: "Bandhumane", meaning: "Friends", phonetic: "bun-dhoo-mah-neh" },
                { word: "Gharaguda", meaning: "Houses", phonetic: "guh-ruh-goo-dah" }
            ],
            phrases: [
                { prompt: "Say 'Many books'", correct: "Bahut bahiguda", meaning: "Many books", hint: "Many + books" },
                { prompt: "Convert 'Book' to 'Books'", correct: "Bahi bahiguda", meaning: "Book books", hint: "Singular + Plural" },
                { prompt: "Say 'My friends'", correct: "Mora bandhumane", meaning: "My friends", hint: "My + friends" }
            ],
            conversations: [
                { prompt: "Tell Miko you have many friends.", correct: "Mora bahut bandhumane achi", meaning: "My many friends are", hint: "My + many + friends" },
                { prompt: "Ask 'Where are the books?'", correct: "Bahiguda kouthi?", meaning: "Where are the books?", hint: "Books + where?" },
                { prompt: "Say 'I don't want these houses'.", correct: "Ehi gharaguda darakara nahi", meaning: "These houses not want", hint: "These + houses + don't want" },
                { prompt: "Final check: Say 'Hello my friends'.", correct: "Namaskara mora bandhumane", meaning: "Hello my friends", hint: "Hello + my + friends" }
            ]
        },
        {
            scenario: "Basic Adjectives",
            vocabulary: [
                { word: "Bara", meaning: "Big", phonetic: "buh-ruh" },
                { word: "Sana", meaning: "Small", phonetic: "suh-nuh" },
                { word: "Bhala", meaning: "Good", phonetic: "bhuh-luh" },
                { word: "Kharap", meaning: "Bad", phonetic: "khuh-ruhp" },
                { word: "Garam", meaning: "Hot", phonetic: "guh-rum" }
            ],
            phrases: [
                { prompt: "Say 'Big house'", correct: "Bara ghara", meaning: "Big house", hint: "Big + house" },
                { prompt: "Say 'Good friend'", correct: "Bhala bandhu", meaning: "Good friend", hint: "Good + friend" },
                { prompt: "Say 'Small water'", correct: "Sana pani", meaning: "Small water", hint: "Small + water" }
            ],
            conversations: [
                { prompt: "Tell Miko 'This is a big book'.", correct: "Eha bara bahi", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Ask for 'Hot water' (Garam pani darakara).", correct: "Garam pani darakara", meaning: "I want hot water", hint: "Hot + water + want" },
                { prompt: "Say 'He is a good teacher'.", correct: "Se bhala shikshaka", meaning: "He is a good teacher", hint: "He + good + teacher" },
                { prompt: "Say 'That is bad'.", correct: "Sehi kharap", meaning: "That is bad", hint: "That + bad" }
            ]
        },
        {
            scenario: "Review & Survival Dialogue",
            vocabulary: [
                { word: "Khana", meaning: "Meal", phonetic: "khah-nuh" },
                { word: "Bill", meaning: "Bill", phonetic: "bil" },
                { word: "Diya", meaning: "Give", phonetic: "dee-yuh" },
                { word: "Danyabada", meaning: "Thank you", phonetic: "dun-yuh-bah-duh" },
                { word: "Baisa", meaning: "Sit", phonetic: "by-suh" }
            ],
            phrases: [
                { prompt: "Say 'Please give the bill'", correct: "Bill diya", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'Thank you Miko'", correct: "Danyabada Miko", meaning: "Thank you Miko", hint: "Thanks + Name" },
                { prompt: "Say 'I want a meal'", correct: "Khana darakara", meaning: "I want a meal", hint: "Meal + want" }
            ],
            conversations: [
                { prompt: "Order a meal and water.", correct: "Khana darakara, pani darakara", meaning: "I want a meal, I want water", hint: "Meal + want + water + want" },
                { prompt: "Ask the waiter for the bill.", correct: "Bill diya", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'This meal is good'.", correct: "Eha khana bhala", meaning: "This meal is good", hint: "This + meal + good" },
                { prompt: "Final check: Say hello, thank you.", correct: "Namaskara, danyabada", meaning: "Hello, thank you", hint: "Greet + Thanks" }
            ]
        },
        {
            scenario: "Present Continuous",
            vocabulary: [
                { word: "Karuchhi", meaning: "am doing", phonetic: "kuh-roo-chhee" },
                { word: "Khauchhi", meaning: "am eating", phonetic: "khow-chhee" },
                { word: "Jauchhi", meaning: "am going", phonetic: "jow-chhee" },
                { word: "Ebe", meaning: "Now", phonetic: "eh-beh" },
                { word: "Kama", meaning: "Work", phonetic: "kah-muh" }
            ],
            phrases: [
                { prompt: "Say 'I am doing work'", correct: "Mu kama karuchhi", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Say 'I am going now'", correct: "Mu ebe jauchhi", meaning: "I am going now", hint: "I + now + going" },
                { prompt: "Say 'I am eating food'", correct: "Mu khana khauchhi", meaning: "I am eating food", hint: "I + food + eating" }
            ],
            conversations: [
                { prompt: "Miko asks what you're doing. Say 'I am doing work'.", correct: "Mu kama karuchhi", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Tell someone 'I am going home now'.", correct: "Mu ebe ghara ku jauchhi", meaning: "I am going home now", hint: "I + now + home + going" },
                { prompt: "Say 'I am eating' when asked.", correct: "Mu khauchhi", meaning: "I am eating", hint: "I + eating" },
                { prompt: "Final check: 'I am doing this now'.", correct: "Mu ebe eha karuchhi", meaning: "I am doing this now", hint: "I + now + this + doing" }
            ]
        },
        {
            scenario: "The 'When' (Time)",
            vocabulary: [
                { word: "Aaji", meaning: "Today", phonetic: "ah-jee" },
                { word: "Kaali", meaning: "Tomorrow", phonetic: "kah-lee" },
                { word: "Agaru", meaning: "Yesterday", phonetic: "uh-guh-roo" },
                { word: "Sebe", meaning: "Then/At that time", phonetic: "seh-beh" },
                { word: "Ghanta", meaning: "Hour", phonetic: "ghun-tuh" }
            ],
            phrases: [
                { prompt: "Say 'Today I am going'", correct: "Aaji mu jauchhi", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'Yesterday I did'", correct: "Agaru mu kaila", meaning: "Yesterday I did", hint: "Yesterday + I + did" },
                { prompt: "Say 'Tomorrow one hour'", correct: "Kaali eka ghanta", meaning: "Tomorrow one hour", hint: "Tomorrow + one + hour" }
            ],
            conversations: [
                { prompt: "Tell Miko you are going today.", correct: "Aaji mu jauchhi", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'I will do it tomorrow'.", correct: "Mu kaali kariba", meaning: "I will do tomorrow", hint: "I + tomorrow + will do" },
                { prompt: "Ask 'Are you going today?' (simple).", correct: "Aaji apana jauchha?", meaning: "Are you going today?", hint: "Today + you + going?" },
                { prompt: "Say 'I ate yesterday'.", correct: "Mu agaru khaila", meaning: "I ate yesterday", hint: "I + yesterday + ate" }
            ]
        },
        {
            scenario: "Simple Past Tense",
            vocabulary: [
                { word: "Kaila", meaning: "Did", phonetic: "ky-luh" },
                { word: "Gela", meaning: "Went", phonetic: "geh-luh" },
                { word: "Khaila", meaning: "Ate", phonetic: "khy-luh" },
                { word: "Dekhila", meaning: "Saw", phonetic: "deh-khee-luh" },
                { word: "Kahila", meaning: "Said", phonetic: "kuh-hee-luh" }
            ],
            phrases: [
                { prompt: "Say 'I went home'", correct: "Mu ghara ku gela", meaning: "I went home", hint: "I + home + went" },
                { prompt: "Say 'I saw that'", correct: "Mu sehi dekhila", meaning: "I saw that", hint: "I + that + saw" },
                { prompt: "Say 'I ate food'", correct: "Mu khana khaila", meaning: "I ate food", hint: "I + food + ate" }
            ],
            conversations: [
                { prompt: "Miko asks about your trip. Say 'I went there'.", correct: "Mu sethi gela", meaning: "I went there", hint: "I + there + went" },
                { prompt: "Say 'I did that yesterday'.", correct: "Mu agaru sehi kaila", meaning: "I yesterday that did", hint: "I + yesterday + that + did" },
                { prompt: "Confirm you saw Miko.", correct: "Mu Miko ku dekhila", meaning: "I saw Miko", hint: "I + name + saw" },
                { prompt: "Final check: 'I went and I ate'.", correct: "Mu gela, mu khaila", meaning: "I went, I ate", hint: "I + went + I + ate" }
            ]
        },
        {
            scenario: "Simple Future Tense",
            vocabulary: [
                { word: "Kariba", meaning: "Will do", phonetic: "kuh-ree-buh" },
                { word: "Jaiba", meaning: "Will go", phonetic: "jy-buh" },
                { word: "Khaiba", meaning: "Will eat", phonetic: "khy-buh" },
                { word: "Dekhiba", meaning: "Will see", phonetic: "deh-khee-buh" },
                { word: "Kaali", meaning: "Tomorrow", phonetic: "kah-lee" }
            ],
            phrases: [
                { prompt: "Say 'I will go tomorrow'", correct: "Mu kaali jaiba", meaning: "I will go tomorrow", hint: "I + tomorrow + will go" },
                { prompt: "Say 'I will eat now'", correct: "Mu ebe khaiba", meaning: "I will eat now", hint: "I + now + will eat" },
                { prompt: "Say 'I will see you'", correct: "Mu apananka dekhiba", meaning: "I will see you", hint: "I + you + will see" }
            ],
            conversations: [
                { prompt: "Miko asks if you'll help. Say 'I will do it'.", correct: "Mu kariba", meaning: "I will do", hint: "I + will do" },
                { prompt: "Tell someone 'I will go home tomorrow'.", correct: "Mu kaali ghara ku jaiba", meaning: "I will go home tomorrow", hint: "I + tomorrow + home + will go" },
                { prompt: "Say 'I will see that film'.", correct: "Mu sehi film dekhiba", meaning: "I will see that film", hint: "I + that + film + will see" },
                { prompt: "Final check: 'I will eat soon'.", correct: "Mu shighra khaiba", meaning: "I will eat soon", hint: "I + soon + will eat" }
            ]
        },
        {
            scenario: "Asking 'Why'",
            vocabulary: [
                { word: "Kena", meaning: "Why", phonetic: "keh-nuh" },
                { word: "Tenu", meaning: "Therefore/That's why", phonetic: "teh-noo" },
                { word: "Bhala lage", meaning: "Like", phonetic: "bhuh-luh lah-geh" },
                { word: "Nahi", meaning: "Not", phonetic: "nah-hee" },
                { word: "Bhaya", meaning: "Fear", phonetic: "bhuh-yuh" }
            ],
            phrases: [
                { prompt: "Ask 'Why are you going?'", correct: "Apana kena jauchha?", meaning: "Why are you going?", hint: "You + why + going?" },
                { prompt: "Say 'Because I like it'", correct: "Tenu mote bhala lage", meaning: "That's why I like it", hint: "Because + me + like" },
                { prompt: "Ask 'Why this?'", correct: "Eha kena?", meaning: "Why this?", hint: "This + why?" }
            ],
            conversations: [
                { prompt: "Miko asks why you're leaving. Say 'Because I am going'.", correct: "Tenu mu jauchhi", meaning: "That's why I am going", hint: "Because + I + going" },
                { prompt: "Ask someone why they want that.", correct: "Sehi kena darakara?", meaning: "Why want that?", hint: "That + why + want?" },
                { prompt: "Say 'I don't know why'.", correct: "Mu kena janina", meaning: "I don't know why", hint: "I + why + not know" },
                { prompt: "Ask 'Why are you here?'", correct: "Apana kena ethi?", meaning: "Why are you here?", hint: "You + why + here?" }
            ]
        },
        {
            scenario: "The 'How'",
            vocabulary: [
                { word: "Kemiti", meaning: "How", phonetic: "keh-mee-tee" },
                { word: "Bhali", meaning: "Well/Very", phonetic: "bhuh-lee" },
                { word: "Sighara", meaning: "Quickly", phonetic: "see-ghuh-ruh" },
                { word: "Ahiste", meaning: "Slowly", phonetic: "ah-his-teh" },
                { word: "Khushi", meaning: "Happy", phonetic: "khoo-shee" }
            ],
            phrases: [
                { prompt: "Ask 'How to do?'", correct: "Kemiti kariba?", meaning: "How to do?", hint: "How + do?" },
                { prompt: "Say 'Go slowly'", correct: "Ahiste jaantu", meaning: "Go slowly", hint: "Slowly + go" },
                { prompt: "Say 'I am doing well'", correct: "Mu bhali karuchhi", meaning: "I am doing well", hint: "I + well + doing" }
            ],
            conversations: [
                { prompt: "Ask Miko how to eat this.", correct: "Eha kemiti khaiba?", meaning: "How to eat this?", hint: "This + how + eat?" },
                { prompt: "Tell someone to do it quickly.", correct: "Sighara kariba", meaning: "Do quickly", hint: "Quickly + do" },
                { prompt: "Say 'I am very happy'.", correct: "Mu bhali khushi", meaning: "I am very happy", hint: "I + well + happy" },
                { prompt: "Ask 'How is your friend?'", correct: "Apana nka bandhu kemiti achi?", meaning: "How is your friend?", hint: "Your + friend + how + is?" }
            ]
        },
        {
            scenario: "Family Relations",
            vocabulary: [
                { word: "Maa", meaning: "Mother", phonetic: "mah" },
                { word: "Bapa", meaning: "Father", phonetic: "bah-puh" },
                { word: "Bhai", meaning: "Elder Brother", phonetic: "bhy" },
                { word: "Bhauni", meaning: "Elder Sister", phonetic: "bhow-nee" },
                { word: "Parivara", meaning: "Family", phonetic: "puh-ree-vah-ruh" }
            ],
            phrases: [
                { prompt: "Say 'My mother'", correct: "Mora maa", meaning: "My mother", hint: "My + mother" },
                { prompt: "Say 'Your father'", correct: "Apana nka bapa", meaning: "Your father", hint: "Your + father" },
                { prompt: "Say 'This is my family'", correct: "Eha mora parivara", meaning: "This is my family", hint: "This + my + family" }
            ],
            conversations: [
                { prompt: "Introduce your mother to Miko.", correct: "Eha mora maa", meaning: "This is my mother", hint: "This + my + mother" },
                { prompt: "Ask 'Where is your home?'", correct: "Apana nka ghara kouthi?", meaning: "Where is your home?", hint: "Your + house + where?" },
                { prompt: "Say 'My brother is a good friend'.", correct: "Mora bhai bhala bandhu", meaning: "My brother is a good friend", hint: "My + brother + good + friend" },
                { prompt: "Point to a photo: 'My elder sister'.", correct: "Mora bhauni", meaning: "My elder sister", hint: "My + sister" }
            ]
        },
        {
            scenario: "Daily Routine",
            vocabulary: [
                { word: "Nidha", meaning: "Sleep", phonetic: "nee-dhuh" },
                { word: "Snana", meaning: "Bath", phonetic: "snah-nuh" },
                { word: "Kama", meaning: "Work", phonetic: "kah-muh" },
                { word: "Uthiba", meaning: "Wake up", phonetic: "oo-thee-buh" },
                { word: "Ranna", meaning: "Cook", phonetic: "run-nuh" }
            ],
            phrases: [
                { prompt: "Say 'I am sleeping'", correct: "Mu nidha jauchhi", meaning: "I am going to sleep", hint: "I + sleep + going" },
                { prompt: "Say 'I want a bath'", correct: "Snana darakara", meaning: "I want a bath", hint: "Bath + want" },
                { prompt: "Say 'I am cooking food'", correct: "Mu khana ranna karuchhi", meaning: "I am cooking food", hint: "I + food + cook + doing" }
            ],
            conversations: [
                { prompt: "Tell Miko you are waking up now.", correct: "Mu ebe uthuchhi", meaning: "I am waking up now", hint: "I + now + wake up" },
                { prompt: "Say 'I have work today'.", correct: "Aaji mora kama achi", meaning: "Today my work is", hint: "Today + my + work + is" },
                { prompt: "Say 'I will sleep later'.", correct: "Mu pore nidha jaiba", meaning: "I will sleep later", hint: "I + later + sleep" },
                { prompt: "Ask Miko 'Did you eat?' (simple).", correct: "Apana khaila?", meaning: "Did you eat?", hint: "You + ate?" }
            ]
        },
        {
            scenario: "Colors & Clothes",
            vocabulary: [
                { word: "Ranga", meaning: "Color", phonetic: "run-guh" },
                { word: "Kapada", meaning: "Clothes", phonetic: "kuh-puh-duh" },
                { word: "Dhala", meaning: "White", phonetic: "dhuh-luh" },
                { word: "Kala", meaning: "Black", phonetic: "kuh-luh" },
                { word: "Lal", meaning: "Red", phonetic: "lul" }
            ],
            phrases: [
                { prompt: "Say 'Red color'", correct: "Lal ranga", meaning: "Red color", hint: "Red + color" },
                { prompt: "Say 'White clothes'", correct: "Dhala kapada", meaning: "White clothes", hint: "White + clothes" },
                { prompt: "Say 'I want black'", correct: "Kala darakara", meaning: "I want black", hint: "Black + want" }
            ],
            conversations: [
                { prompt: "Miko asks your favorite color. Say 'I like red'.", correct: "Mora lal bhala lage", meaning: "I like red", hint: "My + red + like" },
                { prompt: "Say 'I want new clothes'.", correct: "Nua kapada darakara", meaning: "New clothes want", hint: "New + clothes + want" },
                { prompt: "Point to a white shirt: 'This is white'.", correct: "Eha dhala", meaning: "This is white", hint: "This + white" },
                { prompt: "Ask 'What color is that?'", correct: "Sehi kemiti ranga?", meaning: "What color is that?", hint: "That + what + color?" }
            ]
        },
        {
            scenario: "Review & Dialogue: Your Day",
            vocabulary: [
                { word: "Aaji", meaning: "Today", phonetic: "ah-jee" },
                { word: "Bhali", meaning: "Well", phonetic: "bhuh-lee" },
                { word: "Khushi", meaning: "Happy", phonetic: "khoo-shee" },
                { word: "Mone pade", meaning: "Remember", phonetic: "mo-neh puh-deh" },
                { word: "Thik", meaning: "Okay", phonetic: "theek" }
            ],
            phrases: [
                { prompt: "Say 'Today was good'", correct: "Aaji bhala thila", meaning: "Today was good", hint: "Today + good + was" },
                { prompt: "Say 'I am happy today'", correct: "Aaji mu khushi", meaning: "Today I am happy", hint: "Today + I + happy" },
                { prompt: "Say 'I remember you'", correct: "Apananka mote mone pade", meaning: "You I remember", hint: "You + me + remember" }
            ],
            conversations: [
                { prompt: "Miko asks about your day. Say 'It was good'.", correct: "Aaji bhala thila", meaning: "Today it was good", hint: "Today + good + was" },
                { prompt: "Tell Miko 'I am going to work now'.", correct: "Mu ebe kama ku jauchhi", meaning: "I am going to work now", hint: "I + now + work + going" },
                { prompt: "Say 'Okay, thank you'.", correct: "Thik, danyabada", meaning: "Okay, thank you", hint: "Okay + thanks" },
                { prompt: "Final check: Say hello, I am very happy.", correct: "Namaskara, mu bhali khushi", meaning: "Hello, I am very happy", hint: "Hello + I + well + happy" }
            ]
        },
        {
            scenario: "Postpositions",
            vocabulary: [
                { word: "Re", meaning: "In/At", phonetic: "reh" },
                { word: "Upare", meaning: "On/Above", phonetic: "oo-puh-reh" },
                { word: "Tale", meaning: "Under", phonetic: "tah-leh" },
                { word: "Sange", meaning: "With", phonetic: "sun-geh" },
                { word: "Pakhe", meaning: "Near", phonetic: "puh-kheh" }
            ],
            phrases: [
                { prompt: "Say 'In the house'", correct: "Ghara re", meaning: "In the house", hint: "House + in" },
                { prompt: "Say 'On the book'", correct: "Bahi upare", meaning: "On the book", hint: "Book + on" },
                { prompt: "Say 'With me'", correct: "Mora sange", meaning: "With me", hint: "My + with" }
            ],
            conversations: [
                { prompt: "Miko asks where you are. Say 'I am in the house'.", correct: "Mu ghara re achi", meaning: "I am in the house", hint: "I + house + in + am" },
                { prompt: "Tell someone to sit near you.", correct: "Mora pakhe baisa", meaning: "Sit near me", hint: "My + near + sit" },
                { prompt: "Tell Miko 'Go with him'.", correct: "Tanka sange jaantu", meaning: "Go with him", hint: "He + with + go" },
                { prompt: "Say 'Under the big tree'.", correct: "Bara gachha tale", meaning: "Under big tree", hint: "Big + tree + under" }
            ]
        },
        {
            scenario: "The 'Can' & 'Can't'",
            vocabulary: [
                { word: "Pariba", meaning: "Can", phonetic: "puh-ree-buh" },
                { word: "Pariba nahi", meaning: "Can't", phonetic: "puh-ree-buh nah-hee" },
                { word: "Kariba pariba", meaning: "Can do", phonetic: "kuh-ree-buh puh-ree-buh" },
                { word: "Kahiba", meaning: "Speak", phonetic: "kuh-hee-buh" },
                { word: "Sahayata", meaning: "Help", phonetic: "suh-hah-yuh-tuh" }
            ],
            phrases: [
                { prompt: "Say 'I can do'", correct: "Mu kariba pariba", meaning: "I can do", hint: "I + can do" },
                { prompt: "Say 'I can't go'", correct: "Mu jaiba pariba nahi", meaning: "I cannot go", hint: "I + go + cannot" },
                { prompt: "Say 'I can speak Odia'", correct: "Mu Odia kahiba pariba", meaning: "I can speak Odia", hint: "I + Odia + speak + can" }
            ],
            conversations: [
                { prompt: "Miko asks if you can help. Say 'I can help'.", correct: "Mu sahayata kariba pariba", meaning: "I can help", hint: "I + help + can do" },
                { prompt: "Tell someone 'I can't come today'.", correct: "Aaji mu aasiba pariba nahi", meaning: "Today I cannot come", hint: "Today + I + come + cannot" },
                { prompt: "Say 'I can see that'.", correct: "Mu sehi dekhiba pariba", meaning: "I can see that", hint: "I + that + see + can" },
                { prompt: "Final check: 'I can't do this now'.", correct: "Mu ebe eha kariba pariba nahi", meaning: "I now this cannot do", hint: "I + now + this + cannot do" }
            ]
        },
        {
            scenario: "Should & Must",
            vocabulary: [
                { word: "Uchhita", meaning: "Should", phonetic: "oo-chhee-tuh" },
                { word: "Darikar", meaning: "Must/Need", phonetic: "duh-ree-kur" },
                { word: "Kariba uchhita", meaning: "Must do", phonetic: "kuh-ree-buh oo-chhee-tuh" },
                { word: "Jaiba uchhita", meaning: "Must go", phonetic: "jy-buh oo-chhee-tuh" },
                { word: "Khaiba uchhita", meaning: "Must eat", phonetic: "khy-buh oo-chhee-tuh" }
            ],
            phrases: [
                { prompt: "Say 'I must go'", correct: "Mu jaiba uchhita", meaning: "I must go", hint: "I + must go" },
                { prompt: "Say 'I must do work'", correct: "Mu kama kariba uchhita", meaning: "I must do work", hint: "I + work + must do" },
                { prompt: "Say 'I must speak Odia'", correct: "Mu Odia kahiba uchhita", meaning: "I must speak Odia", hint: "I + Odia + must speak" }
            ],
            conversations: [
                { prompt: "Miko says it's late. Say 'I must go home now'.", correct: "Mu ebe ghara ku jaiba uchhita", meaning: "I must go home now", hint: "I + now + home + must go" },
                { prompt: "Tell someone 'You must eat food'.", correct: "Apana khana khaiba uchhita", meaning: "You must eat food", hint: "You + food + must eat" },
                { prompt: "Say 'I must see Miko today'.", correct: "Aaji mu Miko ku dekhiba uchhita", meaning: "Today I must see Miko", hint: "Today + I + name + must see" },
                { prompt: "Final check: 'I must do this tomorrow'.", correct: "Mu kaali eha kariba uchhita", meaning: "I must do this tomorrow", hint: "I + tomorrow + this + must do" }
            ]
        },
        {
            scenario: "Conjunctions",
            vocabulary: [
                { word: "Ebam", meaning: "And", phonetic: "eh-bum" },
                { word: "Kintu", meaning: "But", phonetic: "keen-too" },
                { word: "Karana", meaning: "Because", phonetic: "kuh-ruh-nuh" },
                { word: "Nahole", meaning: "Or", phonetic: "nuh-ho-leh" },
                { word: "Thik", meaning: "Okay", phonetic: "theek" }
            ],
            phrases: [
                { prompt: "Say 'I want water and food'", correct: "Pani ebam khana darakara", meaning: "Water and food want", hint: "Water + and + food + want" },
                { prompt: "Say 'I want this but not that'", correct: "Eha darakara kintu sehi darakara nahi", meaning: "I want this but that don't want", hint: "This + want + but + that + don't want" },
                { prompt: "Say 'This or that?'", correct: "Eha nahole sehi?", meaning: "This or that?", hint: "This + or + that?" }
            ],
            conversations: [
                { prompt: "Miko asks what you want. Say 'Coffee and water'.", correct: "Coffee ebam pani darakara", meaning: "Coffee and water want", hint: "Coffee + and + water + want" },
                { prompt: "Say 'I want to go but I have work'.", correct: "Mu jaiba darakara kintu mora kama achi", meaning: "I must go but I have work", hint: "I + go + but + I + work" },
                { prompt: "Say 'Because I'm happy'.", correct: "Karana mu khushi", meaning: "Because I am happy", hint: "Because + I + happy" },
                { prompt: "Final check: 'Rice or bread?'", correct: "Bhata nahole roti?", meaning: "Rice or bread?", hint: "Rice + or + bread?" }
            ]
        },
        {
            scenario: "The 'If' Clause",
            vocabulary: [
                { word: "Jadi", meaning: "If", phonetic: "juh-dee" },
                { word: "Tahole", meaning: "Then", phonetic: "tuh-ho-leh" },
                { word: "Thile", meaning: "If there is", phonetic: "thee-leh" },
                { word: "Gale", meaning: "If going", phonetic: "guh-leh" },
                { word: "Khale", meaning: "If eating", phonetic: "khuh-leh" }
            ],
            phrases: [
                { prompt: "Say 'If it is here'", correct: "Jadi ethi thile", meaning: "If it is here", hint: "If + here + there is" },
                { prompt: "Say 'If you go, then...'", correct: "Apana gale tahole", meaning: "If you go then", hint: "You + go(if) + then" },
                { prompt: "Say 'If I do work'", correct: "Jadi mu kama kariba", meaning: "If I do work", hint: "If + I + work + do" }
            ],
            conversations: [
                { prompt: "Tell Miko 'If you are happy, I am happy'.", correct: "Jadi apana khushi, tahole mu khushi", meaning: "If you are happy I am happy", hint: "If + you + happy + then + I + happy" },
                { prompt: "Say 'If there is water, I will drink'.", correct: "Jadi pani thile mu phibi", meaning: "If water is there I will drink", hint: "If + water + is + I + drink" },
                { prompt: "Say 'If you want, take it'.", correct: "Jadi apana darakara, niya", meaning: "If you want, take", hint: "If + you + want + take" },
                { prompt: "Final check: 'If tomorrow comes...'", correct: "Jadi kaali aasiba", meaning: "If tomorrow comes", hint: "If + tomorrow + comes" }
            ]
        },
        {
            scenario: "Feeling Words",
            vocabulary: [
                { word: "Khushi", meaning: "Happy", phonetic: "khoo-shee" },
                { word: "Dukha", meaning: "Sad", phonetic: "doo-khuh" },
                { word: "Raga", meaning: "Angry", phonetic: "rah-guh" },
                { word: "Thaka", meaning: "Tired", phonetic: "thuh-kuh" },
                { word: "Bhaya", meaning: "Scared/Fear", phonetic: "bhuh-yuh" }
            ],
            phrases: [
                { prompt: "Say 'I am tired'", correct: "Mu thaka", meaning: "I am tired", hint: "I + tired" },
                { prompt: "Say 'Are you angry?'", correct: "Apana ku raga huchi?", meaning: "Are you angry?", hint: "You + angry + are?" },
                { prompt: "Say 'Don't be sad'", correct: "Dukha kara nahi", meaning: "Don't be sad", hint: "Sad + do not" }
            ],
            conversations: [
                { prompt: "Miko asks how you feel. Say 'I am happy'.", correct: "Mu khushi", meaning: "I am happy", hint: "I + happy" },
                { prompt: "Tell someone you are not scared.", correct: "Mora bhaya nahi", meaning: "I have no fear", hint: "My + fear + not" },
                { prompt: "Say 'I am very tired today'.", correct: "Aaji mu bhali thaka", meaning: "Today I am very tired", hint: "Today + I + well + tired" },
                { prompt: "Point to a sad friend: 'He is sad'.", correct: "Se dukhi achi", meaning: "He is sad", hint: "He + sad + is" }
            ]
        },
        {
            scenario: "Advanced Numbers & Money",
            vocabulary: [
                { word: "Tanka", meaning: "Money", phonetic: "tun-kuh" },
                { word: "Sho", meaning: "Hundred", phonetic: "sho" },
                { word: "Hajara", meaning: "Thousand", phonetic: "huh-jah-ruh" },
                { word: "Lakh", meaning: "Lakh", phonetic: "lukh" },
                { word: "Khuchura", meaning: "Change (coins)", phonetic: "khoo-choo-ruh" }
            ],
            phrases: [
                { prompt: "Say 'Hundred rupees'", correct: "Eka sho tanka", meaning: "100 rupees", hint: "One + hundred + money" },
                { prompt: "Say 'I have money'", correct: "Mora tanka achi", meaning: "I have money", hint: "My + money + is" },
                { prompt: "Say 'Give change'", correct: "Khuchura diya", meaning: "Give change", hint: "Change + give" }
            ],
            conversations: [
                { prompt: "Ask the price in thousands.", correct: "Eka hajara tanka?", meaning: "1000 rupees?", hint: "One + thousand + money?" },
                { prompt: "Tell Miko you don't have change.", correct: "Mora khuchura nahi", meaning: "I don't have change", hint: "My + change + not" },
                { prompt: "Say 'That costs one lakh'.", correct: "Sehi eka lakh tanka", meaning: "That is 1 lakh rupees", hint: "That + one + lakh + money" },
                { prompt: "Ask 'Do you have money?'", correct: "Apana nka tanka achi?", meaning: "Do you have money?", hint: "Your + money + is?" }
            ]
        },
        {
            scenario: "Weather & Travel",
            vocabulary: [
                { word: "Garam", meaning: "Hot", phonetic: "guh-rum" },
                { word: "Yatra", meaning: "Trip/Travel", phonetic: "yuh-truh" },
                { word: "Ticket", meaning: "Ticket", phonetic: "tik-it" },
                { word: "Bus", meaning: "Bus", phonetic: "bus" },
                { word: "Bata", meaning: "Weather", phonetic: "buh-tuh" }
            ],
            phrases: [
                { prompt: "Say 'It's very hot today'", correct: "Aaji bhali garam", meaning: "Today very hot", hint: "Today + well + hot" },
                { prompt: "Say 'I want a bus ticket'", correct: "Bus ticket darakara", meaning: "I want a bus ticket", hint: "Bus + ticket + want" },
                { prompt: "Say 'Safe trip'", correct: "Bhala yatra", meaning: "Good trip", hint: "Good + trip" }
            ],
            conversations: [
                { prompt: "Miko asks about the weather. Say 'It is raining' (Brishti paduchhi).", correct: "Brishti paduchhi", meaning: "Rain is falling", hint: "Rain + falling" },
                { prompt: "Ask someone 'Where is the bus?'", correct: "Bus kouthi?", meaning: "Where is the bus?", hint: "Bus + where?" },
                { prompt: "Say 'I am going on a trip tomorrow'.", correct: "Kaali mu yatra ku jauchhi", meaning: "Tomorrow I am going on a trip", hint: "Tomorrow + I + trip + going" },
                { prompt: "Final check: 'Hot weather today'.", correct: "Aaji garam bata", meaning: "Today hot weather", hint: "Today + hot + weather" }
            ]
        },
        {
            scenario: "Slang & Fillers",
            vocabulary: [
                { word: "Na", meaning: "Right?", phonetic: "nuh" },
                { word: "Dekha", meaning: "Look/See", phonetic: "deh-khuh" },
                { word: "Thik", meaning: "Okay", phonetic: "theek" },
                { word: "Ta", meaning: "Um/So", phonetic: "tuh" },
                { word: "Han", meaning: "Yes", phonetic: "hun" }
            ],
            phrases: [
                { prompt: "Say 'It's good, right?'", correct: "Bhala, na?", meaning: "Good, right?", hint: "Good + right?" },
                { prompt: "Say 'Look there!'", correct: "Sethi dekha!", meaning: "Look there!", hint: "There + look" },
                { prompt: "Say 'Okay, I agree'", correct: "Thik, han", meaning: "Okay, yes", hint: "Okay + yes" }
            ],
            conversations: [
                { prompt: "Miko says something. Respond with 'Right?' (Na?)", correct: "Na?", meaning: "Right?", hint: "Filler word" },
                { prompt: "Point to Miko: 'Look at Miko!'", correct: "Miko ku dekha!", meaning: "See Miko!", hint: "Name + look" },
                { prompt: "Say 'Okay okay' (Thik thik).", correct: "Thik thik", meaning: "Okay okay", hint: "Double filler" },
                { prompt: "Confirm: 'Yes, it is big, right?'", correct: "Han, eha bara, na?", meaning: "Yes, this is big, right?", hint: "Yes + this + big + right?" }
            ]
        },
        {
            scenario: "Final Capstone",
            vocabulary: [
                { word: "Badhila", meaning: "Grew up", phonetic: "buh-dhee-luh" },
                { word: "Kahiba pariba", meaning: "Can speak", phonetic: "kuh-hee-buh puh-ree-buh" },
                { word: "Khushira sathe", meaning: "Happily", phonetic: "khoo-shee-ruh suh-theh" },
                { word: "Odia", meaning: "Odia", phonetic: "oh-dee-yuh" },
                { word: "Mu", meaning: "I", phonetic: "moo" }
            ],
            phrases: [
                { prompt: "Say 'I can speak Odia'", correct: "Mu Odia kahiba pariba", meaning: "I can speak Odia", hint: "I + Odia + speak + can" },
                { prompt: "Say 'I am speaking happily'", correct: "Mu khushira sathe kahuchhi", meaning: "I am speaking happily", hint: "I + happily + speaking" },
                { prompt: "Say 'This is my final'", correct: "Eha mora final", meaning: "This is my final", hint: "This + my + final" }
            ],
            conversations: [
                { prompt: "Tell Miko your full story: 'Hello, I am Ravi, I can speak Odia.'", correct: "Namaskara, mu Ravi, mu Odia kahiba pariba", meaning: "Hello, I am Ravi, I can speak Odia", hint: "Greeting + I + Name + I + Odia + speak can" },
                { prompt: "Say 'I am very happy today'.", correct: "Aaji mu bhali khushi", meaning: "Today I am very happy", hint: "Today + I + well + happy" },
                { prompt: "Tell someone 'I am from Odisha and I grew up there'.", correct: "Mu Odisha ru, mu sethi badhila", meaning: "I from Odisha, I there grew up", hint: "I Odisha from, I there grew up" },
                { prompt: "Final Check: 'Now, I can speak Odia nicely!'", correct: "Ebe mu Odia bhali kahiba pariba", meaning: "Now I can speak Odia nicely", hint: "Now + I + Odia + well + speak can" }
            ]
        }
    ],
    Tamil: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Vanakkam", meaning: "Hello", phonetic: "vuh-nuk-kum" },
                { word: "Naan", meaning: "I", phonetic: "naan" },
                { word: "Neenga", meaning: "You", phonetic: "neen-guh" },
                { word: "Nalla", meaning: "Fine", phonetic: "nul-luh" },
                { word: "Eppadi", meaning: "How", phonetic: "ep-puh-dee" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Vanakkam, naan nalla irukken", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Neenga eppadi irukkeenga?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Naan nalla irukken, neenga?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Vanakkam, naan nalla irukken", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, neenga eppadi irukkeenga?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Neenga eppadi irukkeenga?'. Answer 'Naan nalla irukken'.", correct: "Naan nalla irukken", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Vanakkam, naan nalla irukken, neenga eppadi irukkeenga?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ],
    Bengali: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaskar", meaning: "Hello", phonetic: "nuh-mush-kar" },
                { word: "Ami", meaning: "I", phonetic: "ah-mee" },
                { word: "Apni", meaning: "You", phonetic: "up-nee" },
                { word: "Bhalo", meaning: "Fine", phonetic: "bhah-lo" },
                { word: "Kemon", meaning: "How", phonetic: "keh-mon" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskar, ami bhalo achi", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Apni kemon achen?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Ami bhalo achi, apni?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskar, ami bhalo achi", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, apni kemon achen?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Apni kemon achen?'. Answer 'Ami bhalo achi'.", correct: "Ami bhalo achi", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaskar, ami bhalo achi, apni kemon achen?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ],
    Marathi: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaskar", meaning: "Hello", phonetic: "nuh-mus-kar" },
                { word: "Mi", meaning: "I", phonetic: "mee" },
                { word: "Tumhi", meaning: "You", phonetic: "too-mhee" },
                { word: "Thik", meaning: "Fine", phonetic: "theek" },
                { word: "Kasa", meaning: "How", phonetic: "kuh-sah" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskar, mi thik ahe", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Tumhi kasa ahat?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Mi thik ahe, ani tumhi?", meaning: "I am fine, and you?", hint: "I + fine + am + and + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskar, mi thik ahe", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, tumhi kasa ahat?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Tumhi kasa ahat?'. Answer 'Mi thik ahe'.", correct: "Mi thik ahe", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaskar, mi thik ahe, tumhi kasa ahat?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ],
    Malayalam: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Namaskkaram", meaning: "Hello", phonetic: "nuh-mus-kah-rum" },
                { word: "Njan", meaning: "I", phonetic: "nyahn" },
                { word: "Ningal", meaning: "You", phonetic: "neen-gul" },
                { word: "Sugam", meaning: "Fine", phonetic: "soo-gum" },
                { word: "Engane", meaning: "How", phonetic: "eng-uh-neh" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskkaram, njan sugam-ayi irikkunnu", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Ningalude sugamano?", meaning: "How are you?", hint: "Your + fine?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Njan sugam-ayi irikkunnu, ningalo?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskkaram, njan sugam-ayi irikkunnu", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, sugamano?", meaning: "Miko, are you fine?", hint: "Name + fine?" },
                { prompt: "Someone asks 'Sugamano?'. Answer 'Sugam' (Fine).", correct: "Sugam", meaning: "Fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Namaskkaram, njan sugam-ayi irikkunnu, ningalku sugamano?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ],
    Urdu: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Assalamu Alaikum", meaning: "Hello", phonetic: "us-suh-lah-moo ah-lai-koom" },
                { word: "Main", meaning: "I", phonetic: "mayn" },
                { word: "Aap", meaning: "You", phonetic: "ahp" },
                { word: "Theek", meaning: "Fine", phonetic: "theek" },
                { word: "Kaise", meaning: "How", phonetic: "kai-say" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Assalamu Alaikum, main theek hoon", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Aap kaise hain?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Main theek hoon, aap?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Assalamu Alaikum, main theek hoon", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, aap kaise hain?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Aap kaise hain?'. Answer 'Main theek hoon'.", correct: "Main theek hoon", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Assalamu Alaikum, main theek hoon, aap kaise hain?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ],
    Punjabi: [
        {
            scenario: "Pronouns & Greetings",
            vocabulary: [
                { word: "Sat Sri Akaal", meaning: "Hello", phonetic: "sut sree ah-kahl" },
                { word: "Main", meaning: "I", phonetic: "mayn" },
                { word: "Tusi", meaning: "You", phonetic: "too-see" },
                { word: "Theek", meaning: "Fine", phonetic: "theek" },
                { word: "Ki haal", meaning: "How", phonetic: "kee hahl" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Sat Sri Akaal, main theek haan", meaning: "Hello, I am fine", hint: "Hello + I + fine + am" },
                { prompt: "Ask 'How are you?' (formal)", correct: "Tusi ki haal ho?", meaning: "How are you?", hint: "You + how + are?" },
                { prompt: "Say 'I am fine, and you?'", correct: "Main theek haan, tusi?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Sat Sri Akaal, main theek haan", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, tusi ki haal ho?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
                { prompt: "Someone asks 'Tusi ki haal ho?'. Answer 'Main theek haan'.", correct: "Main theek haan", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Final check: Say hello, I am fine, how are you?", correct: "Sat Sri Akaal, main theek haan, tusi ki haal ho?", meaning: "Hello, I am fine, how are you?", hint: "Full intro" }
            ]
        }
    ]
};

/* ────────────────────────────────────────────────────────────────
   Language availability — SINGLE SOURCE OF TRUTH.

   Derived from CURRICULUM itself so the language picker can never
   drift from the content that actually exists. Previously the picker
   hardcoded its own list (and offered English, which has no lessons),
   while Chat.jsx silently fell back to Hindi and TopicGrid.jsx to
   Telugu — so a learner could be taught a language they never chose.

   Raise a language above MIN_LESSONS and it appears automatically.
   ──────────────────────────────────────────────────────────────── */

export const MIN_LESSONS = 10;

export const LESSON_COUNTS = Object.fromEntries(
    Object.entries(CURRICULUM).map(([lang, lessons]) => [lang, lessons.length])
);

/** Languages with enough content to teach. Everything else is "Coming soon". */
export const AVAILABLE_LANGUAGES = Object.keys(CURRICULUM)
    .filter(lang => CURRICULUM[lang].length >= MIN_LESSONS);

/** Accepts a language name; unknown names (e.g. English) are unavailable. */
export function isLanguageAvailable(name) {
    return AVAILABLE_LANGUAGES.includes(name);
}

export function lessonCount(name) {
    return LESSON_COUNTS[name] || 0;
}
