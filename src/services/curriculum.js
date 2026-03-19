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
                { word: "Bagunna", meaning: "Fine", phonetic: "bah-goon-nah" },
                { word: "Ela", meaning: "How", phonetic: "eh-lah" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskaram, nenu bagunna", meaning: "Hello, I am fine", hint: "Hello + I + fine" },
                { prompt: "Ask 'How are you?'", correct: "Meeru ela", meaning: "How are you?", hint: "You + how?", grammarNote: "Acknowledge that 'Meeru ela' is a great start! Bonus tip: In real Telugu, native speakers add the word 'unnaru' at the end to be polite: 'Meeru ela unnaru?'. Don't punish the user, just share this as a fun fact!" },
                { prompt: "Say 'I am fine, and you?'", correct: "Nenu bagunna, meeru?", meaning: "I am fine, and you?", hint: "I + fine + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskaram, nenu bagunna", meaning: "Hello, I am fine", hint: "Basic greeting + state" },
                { prompt: "Ask Miko how she is doing.", correct: "Miko, meeru ela", meaning: "Miko, how are you?", hint: "Name + you + how?", grammarNote: "Bonus tip: Share gracefully that natives say 'Miko, meeru ela unnaru?' but their sentence is perfectly understandable!" },
                { prompt: "Someone asks how you are. Answer: 'I am fine'.", correct: "Nenu bagunna", meaning: "I am fine", hint: "Direct answer" },
                { prompt: "Say hello, tell them you are fine, and ask how they are.", correct: "Namaskaram, nenu bagunna. Meeru ela", meaning: "Hello, I am fine, how are you?", hint: "Full intro", grammarNote: "Praise them! Again, just remind them lightly that 'unnaru' is the formal verb for 'are'." }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Idhi", meaning: "This", phonetic: "ee-dhee" },
                { word: "Adhi", meaning: "That", phonetic: "ah-dhee" },
                { word: "Emiti", meaning: "What", phonetic: "eh-mee-tee" },
                { word: "Pusthakam", meaning: "Book", phonetic: "poos-tah-kam" },
                { word: "Peru", meaning: "Name", phonetic: "peh-roo" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Idhi emiti?", meaning: "What is this?", hint: "This + what?" },
                { prompt: "Say 'This is a book'", correct: "Idhi pusthakam", meaning: "This is a book", hint: "This + book" },
                { prompt: "Combine 'You' (from last lesson) and 'Name What?'", correct: "Meeru peru emiti?", meaning: "What is your name?", hint: "You + name + what?", grammarNote: "In casual spoken Telugu, combining 'You + Name + What' works! Later you'll learn the strict possessive 'Mee'." }
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
                { word: "Ekkada", meaning: "Where", phonetic: "ek-kah-dah" },
                { word: "Vellu", meaning: "Go", phonetic: "vel-loo" },
                { word: "Ikkada", meaning: "Here", phonetic: "ik-kah-dah" },
                { word: "Akkada", meaning: "There", phonetic: "ak-kah-dah" },
                { word: "Inti", meaning: "Home/House", phonetic: "in-tee" }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Inti ekkada?", meaning: "Where is the house?", hint: "House + where?" },
                { prompt: "Say 'I am here' (Use 'I' from Scenario 1)", correct: "Nenu ikkada", meaning: "I am here", hint: "I + here" },
                { prompt: "Say 'Go there'", correct: "Akkada vellu", meaning: "Go there", hint: "There + go" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Inti ekkada?", meaning: "Where is the home?", hint: "Location question" },
                { prompt: "Tell someone to go there.", correct: "Akkada vellu", meaning: "Go there", hint: "Direction" },
                { prompt: "Someone asks 'Meeru ekkada?'. Connect 'I am here' with 'You?' (from Scenario 1).", correct: "Nenu ikkada, meeru?", meaning: "I am here, and you?", hint: "I + here + you?" },
                { prompt: "Say 'I go home'. Start with 'I' (Nenu).", correct: "Nenu inti vellu", meaning: "I go home", hint: "I + home + go", grammarNote: "Literally 'I home go'. Telugu follows Subject-Object-Verb order!" }
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
                { prompt: "Miko offers you food you don't like. Say 'Food don't want'.", correct: "Annam oddu", meaning: "Food don't want", hint: "Food + don't want" },
                { prompt: "Point to a book (from Scenario 2) and say 'Book want'.", correct: "Pusthakam kaavali", meaning: "Book want", hint: "Book + want" },
                { prompt: "Point far away and say 'That don't want' (Use 'That' from Scenario 2).", correct: "Adhi oddu", meaning: "That don't want", hint: "That + don't want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Naa", meaning: "My", phonetic: "nah" },
                { word: "Mee", meaning: "Your", phonetic: "mee" },
                { word: "Ayana", meaning: "His", phonetic: "ah-yah-nah" },
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
                { word: "Evaru", meaning: "Who", phonetic: "eh-vah-roo" },
                { word: "Snehithudu", meaning: "Friend", phonetic: "sneh-hee-thoo-doo" },
                { word: "Guruvu", meaning: "Teacher", phonetic: "goo-roo-voo" },
                { word: "Thammudu", meaning: "Brother", phonetic: "tham-moo-doo" },
                { word: "Akka", meaning: "Sister", phonetic: "ak-kah" }
            ],
            phrases: [
                { prompt: "Ask 'Who is this?'", correct: "Idhi evaru?", meaning: "Who is this?", hint: "This + who?" },
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
                { prompt: "Say 'One book'", correct: "Okati pusthakam", meaning: "One book", hint: "One + book" },
                { prompt: "Say 'Two friends'", correct: "Rendu snehithulu", meaning: "Two friends", hint: "Two + friends(pl)" },
                { prompt: "Say 'Five houses'", correct: "Aidhu illu", meaning: "Five houses", hint: "Five + house" }
            ],
            conversations: [
                { prompt: "Miko asks how many books. Say 'Three books'.", correct: "Moodu pusthakalu", meaning: "Three books", hint: "Three + books" },
                { prompt: "Say 'I want two' (using Rendu kaavali).", correct: "Rendu kaavali", meaning: "I want two", hint: "Number + want" },
                { prompt: "Tell Miko 'I have one sister' (using Naa akka okati).", correct: "Naa akka okati", meaning: "My sister one", hint: "My + sister + number" },
                { prompt: "Count 1, 2, 3.", correct: "Okati, rendu, moodu", meaning: "1, 2, 3", hint: "Consecutive" }
            ]
        },
        {
            scenario: "Plurals",
            icon: "📚",
            color: "#fff1f2",
            vocabulary: [
                { word: "Lu", meaning: "(Plural suffix)", phonetic: "loo" },
                { word: "Pusthakalu", meaning: "Books", phonetic: "poos-tah-kah-loo" },
                { word: "Snehithulu", meaning: "Friends", phonetic: "sneh-hee-thoo-loo" },
                { word: "Illu", meaning: "Houses", phonetic: "il-loo" },
                { word: "Ballem", meaning: "Spears/Items", phonetic: "bal-lem" }
            ],
            phrases: [
                { prompt: "Say 'Many books' (Ekkuva pusthakalu)", correct: "Ekkuva pusthakalu", meaning: "Many books", hint: "Many + books" },
                { prompt: "Convert 'Book' to 'Books'", correct: "Pusthakam pusthakalu", meaning: "Book books", hint: "Singular + Plural" },
                { prompt: "Say 'My friends'", correct: "Naa snehithulu", meaning: "My friends", hint: "My + friends" }
            ],
            conversations: [
                { prompt: "Tell Miko you have many friends.", correct: "Naa ekkuva snehithulu", meaning: "My many friends", hint: "My + many + friends" },
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
                { prompt: "Say 'Small water' (Small bottle)", correct: "Chinna neeru", meaning: "Small water", hint: "Small + water" }
            ],
            conversations: [
                { prompt: "Tell Miko 'This is a big book'.", correct: "Idhi pedda pusthakam", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Ask for 'Hot water' (Vedi neeru kaavali).", correct: "Vedi neeru kaavali", meaning: "I want hot water", hint: "Hot + water + want" },
                { prompt: "Say 'He is a good teacher'.", correct: "Ayana manchi guruvu", meaning: "He is a good teacher", hint: "He + good + teacher" },
                { prompt: "Say 'That is bad'.", correct: "Adhi chedu", meaning: "That is bad", hint: "That + bad" }
            ]
        },
        {
            scenario: "Review & Survival Dialogue",
            icon: "🍽️",
            color: "#fee2e2",
            vocabulary: [
                { word: "Bhojanam", meaning: "Meal", phonetic: "bho-jah-nam" },
                { word: "Billu", meaning: "Bill", phonetic: "bil-loo" },
                { word: "Ivvandi", meaning: "Give (please)", phonetic: "iv-van-dee" },
                { word: "Danyavadhalu", meaning: "Thank you", phonetic: "dan-yah-vah-dhah-loo" },
                { word: "Kurchoni", meaning: "Sit", phonetic: "koor-cho-nee" }
            ],
            phrases: [
                { prompt: "Say 'Please give the bill'", correct: "Billu ivvandi", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'Thank you Miko'", correct: "Danyavadhalu Miko", meaning: "Thank you Miko", hint: "Thanks + Name" },
                { prompt: "Say 'I want a meal'", correct: "Bhojanam kaavali", meaning: "I want a meal", hint: "Meal + want" }
            ],
            conversations: [
                { prompt: "Order a meal and water.", correct: "Bhojanam kaavali, neeru kaavali", meaning: "I want a meal, I want water", hint: "Meal + want + water + want" },
                { prompt: "Ask the waiter for the bill.", correct: "Billu ivvandi", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'This meal is good'.", correct: "Ee bhojanam manchi", meaning: "This meal is good", hint: "This + meal + good" },
                { prompt: "Final check: Say hello, thank you.", correct: "Namaskaram, danyavadhalu", meaning: "Hello, thank you", hint: "Greet + Thanks" }
            ]
        },

        // Phase 2: The "Action" Phase (Lessons 11–20)
        {
            scenario: "Present Continuous",
            vocabulary: [
                { word: "Chestunnanu", meaning: "am doing", phonetic: "ches-thoon-nah-noo" },
                { word: "Tinunnanu", meaning: "am eating", phonetic: "theen-oon-nah-noo" },
                { word: "Velthunnanu", phonetic: "vel-thoon-nah-noo", meaning: "am going" },
                { word: "Ippudu", meaning: "Now", phonetic: "ip-poo-doo" },
                { word: "Panu", meaning: "Work", phonetic: "pah-noo" }
            ],
            phrases: [
                { prompt: "Say 'I am doing work'", correct: "Nenu panu chestunnanu", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Say 'I am going now'", correct: "Nenu ippudu velthunnanu", meaning: "I am going now", hint: "I + now + going" },
                { prompt: "Say 'I am eating food'", correct: "Nenu annam tinunnanu", meaning: "I am eating food", hint: "I + food + eating" }
            ],
            conversations: [
                { prompt: "Miko asks what you're doing. Say 'I am doing work'.", correct: "Nenu panu chestunnanu", meaning: "I am doing work", hint: "I + work + doing" },
                { prompt: "Tell someone 'I am going home now'.", correct: "Nenu ippudu inti velthunnanu", meaning: "I am going home now", hint: "I + now + home + going" },
                { prompt: "Say 'I am eating' when asked.", correct: "Nenu tinunnanu", meaning: "I am eating", hint: "I + eating" },
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
                { prompt: "Say 'Tomorrow one hour'", correct: "Repu okati ganta", meaning: "Tomorrow one hour", hint: "Tomorrow + one + hour" }
            ],
            conversations: [
                { prompt: "Tell Miko you are going today.", correct: "Eeroju nenu velthunnanu", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'I will do it tomorrow'.", correct: "Nenu repu chestanu", meaning: "I will do tomorrow", hint: "I + tomorrow + will do" },
                { prompt: "Ask 'When are you going?' (using simple words)", correct: "Eeroju meeru velthunnara?", meaning: "Are you going today?", hint: "Today + you + going(q)?" },
                { prompt: "Say 'I ate yesterday'.", correct: "Nenu ninna thinnanu", meaning: "I ate yesterday", hint: "I + yesterday + ate" }
            ]
        },
        {
            scenario: "Simple Past Tense",
            vocabulary: [
                { word: "Chesanu", meaning: "Did", phonetic: "cheh-sah-noo" },
                { word: "Vellanu", meaning: "Went", phonetic: "vel-lah-noo" },
                { word: "Thinnanu", meaning: "Ate", phonetic: "thin-nah-noo" },
                { word: "Chusanu", meaning: "Saw", phonetic: "choo-sah-noo" },
                { word: "Pannanu", meaning: "Spoke/Did", phonetic: "pan-nah-noo" }
            ],
            phrases: [
                { prompt: "Say 'I went home'", correct: "Nenu inti vellanu", meaning: "I went home", hint: "I + home + went" },
                { prompt: "Say 'I saw that'", correct: "Nenu adhi chusanu", meaning: "I saw that", hint: "I + that + saw" },
                { prompt: "Say 'I ate food'", correct: "Nenu annam thinnanu", meaning: "I ate food", hint: "I + food + ate" }
            ],
            conversations: [
                { prompt: "Miko asks about your trip. Say 'I went there'.", correct: "Nenu akkada vellanu", meaning: "I went there", hint: "I + there + went" },
                { prompt: "Say 'I did that yesterday'.", correct: "Nenu ninna adhi chesanu", meaning: "I yesterday that did", hint: "I + yesterday + that + did" },
                { prompt: "Confirm you saw Miko.", correct: "Nenu Miko chusanu", meaning: "I saw Miko", hint: "I + name + saw" },
                { prompt: "Final check: 'I went and I ate'.", correct: "Nenu vellanu, nenu thinnanu", meaning: "I went, I ate", hint: "I + went + I + ate" }
            ]
        },
        {
            scenario: "Simple Future Tense",
            vocabulary: [
                { word: "Chestanu", meaning: "Will do", phonetic: "ches-tah-noo" },
                { word: "Velthanu", meaning: "Will go", phonetic: "vel-thah-noo" },
                { word: "Tintanu", meaning: "Will eat", phonetic: "theen-tah-noo" },
                { word: "Chustanu", meaning: "Will see", phonetic: "choos-tah-noo" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "reh-poo" }
            ],
            phrases: [
                { prompt: "Say 'I will go tomorrow'", correct: "Nenu repu velthanu", meaning: "I will go tomorrow", hint: "I + tomorrow + will go" },
                { prompt: "Say 'I will eat now'", correct: "Nenu ippudu tintanu", meaning: "I will eat now", hint: "I + now + will eat" },
                { prompt: "Say 'I will see you'", correct: "Nenu meeru chustanu", meaning: "I will see you", hint: "I + you + will see" }
            ],
            conversations: [
                { prompt: "Miko asks if you'll help. Say 'I will do it'.", correct: "Nenu chestanu", meaning: "I will do", hint: "I + will do" },
                { prompt: "Tell someone 'I will go home tomorrow'.", correct: "Nenu repu inti velthanu", meaning: "I will go home tomorrow", hint: "I + tomorrow + home + will go" },
                { prompt: "Say 'I will see that movie'.", correct: "Nenu adhi cinema chustanu", meaning: "I will see that movie", hint: "I + that + movie + see" },
                { prompt: "Final check: 'I will eat soon'.", correct: "Nenu tharuvatha tintanu", meaning: "I will eat later", hint: "I + later + will eat" }
            ]
        },
        {
            scenario: "Asking 'Why' (Enduku)",
            vocabulary: [
                { word: "Enduku", meaning: "Why", phonetic: "en-doo-koo" },
                { word: "Andhuke", meaning: "Because/That's why", phonetic: "an-dhoo-keh" },
                { word: "Ishtam", meaning: "Like", phonetic: "ish-tam" },
                { word: "Ledu", meaning: "No/Not", phonetic: "leh-doo" },
                { word: "Bhayam", meaning: "Fear", phonetic: "bhah-yam" }
            ],
            phrases: [
                { prompt: "Ask 'Why are you going?'", correct: "Meeru enduku velthunnaru?", meaning: "Why are you going?", hint: "You + why + going?" },
                { prompt: "Say 'Because I like it'", correct: "Andhuke nenu ishtam", meaning: "That's why I like", hint: "Because + I + like" },
                { prompt: "Ask 'Why this?'", correct: "Idhi enduku?", meaning: "Why this?", hint: "This + why?" }
            ],
            conversations: [
                { prompt: "Miko asks why you're leaving. Say 'Because I am tired' (using simple words).", correct: "Andhuke nenu velthunnanu", meaning: "That's why I am going", hint: "Because + I + going" },
                { prompt: "Ask someone why they want that.", correct: "Adhi enduku kaavali?", meaning: "Why want that?", hint: "That + why + want" },
                { prompt: "Say 'I don't know why'.", correct: "Enduku nenu ledu", meaning: "Why I not", hint: "Why + I + not" },
                { prompt: "Ask 'Why are you here?'", correct: "Meeru enduku ikkada?", meaning: "Why are you here?", hint: "You + why + here?" }
            ]
        },
        {
            scenario: "The 'How' (Ela)",
            vocabulary: [
                { word: "Ela", meaning: "How", phonetic: "eh-lah" },
                { word: "Baga", meaning: "Well/Very", phonetic: "bah-gah" },
                { word: "Tvaraga", meaning: "Quickly", phonetic: "tvah-rah-gah" },
                { word: "Mellanega", meaning: "Slowly", phonetic: "mel-lah-neh-gah" },
                { word: "Santhosham", meaning: "Happy", phonetic: "san-tho-sham" }
            ],
            phrases: [
                { prompt: "Ask 'How to do?'", correct: "Ela cheyali?", meaning: "How to do?", hint: "How + do?" },
                { prompt: "Say 'Go slowly'", correct: "Mellanega vellu", meaning: "Go slowly", hint: "Slowly + go" },
                { prompt: "Say 'I am doing well'", correct: "Nenu baga chestunnanu", meaning: "I am doing well", hint: "I + well + doing" }
            ],
            conversations: [
                { prompt: "Ask Miko how to eat this.", correct: "Idhi ela thinali?", meaning: "How to eat this?", hint: "This + how + eat?" },
                { prompt: "Tell someone to do it quickly.", correct: "Tvaraga cheyali", meaning: "Do quickly", hint: "Quickly + do" },
                { prompt: "Say 'I am very happy'.", correct: "Nenu baga santhosham", meaning: "I am very happy", hint: "I + well + happy" },
                { prompt: "Ask 'How is your friend?'.", correct: "Mee snehithudu ela?", meaning: "How is your friend?", hint: "Your + friend + how?" }
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
                { prompt: "Point to a photo: 'My elder sister'.", correct: "Naa akka", meaning: "My sister", hint: "My + sister" }
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
                { prompt: "Say 'I am sleeping'", correct: "Nenu niddra velthunnanu", meaning: "I am going to sleep", hint: "I + sleep + going" },
                { prompt: "Say 'I want a bath'", correct: "Snanam kaavali", meaning: "I want a bath", hint: "Bath + want" },
                { prompt: "Say 'I am cooking food'", correct: "Nenu annam vanta chestunnanu", meaning: "I am cooking food", hint: "I + food + cook + doing" }
            ],
            conversations: [
                { prompt: "Tell Miko you are waking up now.", correct: "Nenu ippudu melukonnanu", meaning: "I wake up now", hint: "I + now + wake up" },
                { prompt: "Say 'I have work today'.", correct: "Eeroju nenu pani", meaning: "Today I work", hint: "Today + I + work" },
                { prompt: "Say 'I will sleep later'.", correct: "Nenu tharuvatha niddra", meaning: "I later sleep", hint: "I + later + sleep" },
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
                { prompt: "Miko asks your favorite color. Say 'I like red'.", correct: "Naa ishtam erupu", meaning: "My like red", hint: "My + like + red" },
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
                { prompt: "Say 'Today was good'", correct: "Eeroju baga", meaning: "Today well", hint: "Today + well" },
                { prompt: "Say 'I am happy today'", correct: "Eeroju nenu santhosham", meaning: "Today I am happy", hint: "Today + I + happy" },
                { prompt: "Say 'I remember you'", correct: "Meeru gurthundi", meaning: "You remember", hint: "You + remember" }
            ],
            conversations: [
                { prompt: "Miko asks about your day. Say 'It was good'.", correct: "Eeroju baga", meaning: "Today well", hint: "Today + well" },
                { prompt: "Tell Miko 'I am going to work now'.", correct: "Nenu ippudu pani velthunnanu", meaning: "I am going to work now", hint: "I + now + work + going" },
                { prompt: "Say 'Okay, thank you'.", correct: "Sare, danyavadhalu", meaning: "Okay, thank you", hint: "Okay + thanks" },
                { prompt: "Final check: Say hello, I am very happy.", correct: "Namaskaram, nenu baga santhosham", meaning: "Hello, I am very happy", hint: "Hello + I + well + happy" }
            ]
        },

        // Phase 3: The "Connector" Phase (Lessons 21–30)
        {
            scenario: "Postpositions",
            vocabulary: [
                { word: "Lo", meaning: "In", phonetic: "loh" },
                { word: "Paina", meaning: "On/Above", phonetic: "pye-nah" },
                { word: "Kindha", meaning: "Under", phonetic: "keen-dhah" },
                { word: "Tho", meaning: "With", phonetic: "tho" },
                { word: "Daggara", meaning: "Near", phonetic: "dag-gah-rah" }
            ],
            phrases: [
                { prompt: "Say 'In the house'", correct: "Inti lo", meaning: "In the house", hint: "House + in" },
                { prompt: "Say 'On the book'", correct: "Pusthakam paina", meaning: "On the book", hint: "Book + on" },
                { prompt: "Say 'With me' (using Tho)", correct: "Naa tho", meaning: "With me", hint: "My + with" }
            ],
            conversations: [
                { prompt: "Miko asks where you are. Say 'I am in the house'.", correct: "Nenu inti lo", meaning: "I am in the house", hint: "I + house + in" },
                { prompt: "Tell someone to sit near you.", correct: "Naa daggara kurchoni", meaning: "Sit near me", hint: "My + near + sit" },
                { prompt: "Tell Miko 'Go with him'.", correct: "Ayana tho vellu", meaning: "Go with him", hint: "He + with + go" },
                { prompt: "Say 'Under the big tree'.", correct: "Pedda chettu kindha", meaning: "Under big tree", hint: "Big + tree + under" }
            ]
        },
        {
            scenario: "The 'Can' & 'Can't'",
            vocabulary: [
                { word: "Galanu", meaning: "Can", phonetic: "gah-lah-noo" },
                { word: "Lenu", meaning: "Can't", phonetic: "leh-noo" },
                { word: "Cheyagalanu", meaning: "Can do", phonetic: "cheh-yah-gah-lah-noo" },
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
                { word: "Aali", meaning: "(Must suffix)", phonetic: "ah-lee" },
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
                { prompt: "Miko says it's late. Say 'I must go home now'.", correct: "Nenu ippudu inti vellali", meaning: "I must go home now", hint: "I + now + home + must go" },
                { prompt: "Tell someone 'You must eat food'.", correct: "Meeru annam thinali", meaning: "You must eat food", hint: "You + food + must eat" },
                { prompt: "Say 'I must see Miko today'.", correct: "Eeroju nenu Miko chudali", meaning: "Today I must see Miko", hint: "Today + I + name + must see" },
                { prompt: "Final check: 'I must do this tomorrow'.", correct: "Nenu repu idhi cheyali", meaning: "I must do this tomorrow", hint: "I + tomorrow + this + must do" }
            ]
        },
        {
            scenario: "Conjunctions",
            vocabulary: [
                { word: "Mariyu", meaning: "And", phonetic: "mah-ree-yoo" },
                { word: "Kani", meaning: "But", phonetic: "kah-nee" },
                { word: "Endukante", meaning: "Because", phonetic: "en-doo-kan-teh" },
                { word: "Leda", meaning: "Or", phonetic: "leh-dah" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" }
            ],
            phrases: [
                { prompt: "Say 'I want water and food'", correct: "Neeru mariyu annam kaavali", meaning: "Water and food want", hint: "Water + and + food + want" },
                { prompt: "Say 'I want this but not that'", correct: "Idhi kaavali kani adhi oddu", meaning: "I want this but that don't want", hint: "This + want + but + that + don't want" },
                { prompt: "Say 'This or that?'", correct: "Idhi leda adhi?", meaning: "This or that?", hint: "This + or + that?" }
            ],
            conversations: [
                { prompt: "Miko asks what you want. Say 'Coffee and water'.", correct: "Coffee mariyu neeru kaavali", meaning: "Coffee and water want", hint: "Coffee + and + water + want" },
                { prompt: "Say 'I want to go but I have work'.", correct: "Nenu vellali kani nenu pani", meaning: "I must go but I have work", hint: "I + go(must) + but + I + work" },
                { prompt: "Say 'Because I'm happy'.", correct: "Endukante nenu santhosham", meaning: "Because I am happy", hint: "Because + I + happy" },
                { prompt: "Final check: 'Rice or bread?' (Annam leda roti?)", correct: "Annam leda roti", meaning: "Rice or bread", hint: "Rice + or + bread" }
            ]
        },
        {
            scenario: "The 'If' Clause",
            vocabulary: [
                { word: "Unte", meaning: "If there is", phonetic: "oon-teh" },
                { word: "Velle", meaning: "If going", phonetic: "vel-leh" },
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
                { prompt: "Tell Miko 'If you are happy, I am happy'.", correct: "Meeru santhosham unte, nenu santhosham", meaning: "If you are happy I am happy", hint: "You + happy + if + I + happy" },
                { prompt: "Say 'If there is water, I will drink'.", correct: "Neeru unte nenu thaganu", meaning: "If water is there I drink", hint: "Water + if + I + drink" },
                { prompt: "Say 'If you want, take it'.", correct: "Meeru kaavali unte theesko", meaning: "If you want take", hint: "You + want + if + take" },
                { prompt: "Final check: 'If tomorrow comes...'", correct: "Repu unte", meaning: "If tomorrow stays", hint: "Tomorrow + if" }
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
                { prompt: "Say 'I am tired'", correct: "Nenu alupu", meaning: "I am tired", hint: "I + tired" },
                { prompt: "Say 'Are you angry?'", correct: "Meeru kopam unnara?", meaning: "Are you angry?", hint: "You + angry + are?" },
                { prompt: "Say 'Don't be sad'", correct: "Badha oddu", meaning: "Sad don't want", hint: "Sad + don't" }
            ],
            conversations: [
                { prompt: "Miko asks how you feel. Say 'I am happy'.", correct: "Nenu santhosham", meaning: "I am happy", hint: "I + happy" },
                { prompt: "Tell someone you are not scared.", correct: "Nenu bhayam ledu", meaning: "I have no fear", hint: "I + fear + not" },
                { prompt: "Say 'I am very tired today'.", correct: "Eeroju nenu baga alupu", meaning: "Today I am very tired", hint: "Today + I + well + tired" },
                { prompt: "Point to a sad friend: 'He is sad'.", correct: "Ayana badha", meaning: "He is sad", hint: "He + sad" }
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
                { prompt: "Say 'That costs one lakh'.", correct: "Adhi okati laksha", meaning: "That is 1 lakh", hint: "That + one + lakh" },
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
                { word: "Veli", meaning: "Go (polite)", phonetic: "veh-lee" }
            ],
            phrases: [
                { prompt: "Say 'It's very hot today' (Eeroju baga enda)", correct: "Eeroju baga enda", meaning: "Today very hot", hint: "Today + well + heat" },
                { prompt: "Say 'I want a bus ticket'", correct: "Bus ticketu kaavali", meaning: "I want a bus ticket", hint: "Bus + ticket + want" },
                { prompt: "Say 'Safe trip' (Manchi prayanam)", correct: "Manchi prayanam", meaning: "Good trip", hint: "Good + trip" }
            ],
            conversations: [
                { prompt: "Miko asks about the weather. Say 'It is raining' (Vana paduthundi).", correct: "Vana paduthundi", meaning: "Rain is falling", hint: "Rain + falling" },
                { prompt: "Ask someone 'Where is the bus?'", correct: "Bus ekkada?", meaning: "Where is the bus?", hint: "Bus + where?" },
                { prompt: "Say 'I am going on a trip tomorrow'.", correct: "Repu nenu prayanam velthunnanu", meaning: "Tomorrow I trip going", hint: "Tomorrow + I + trip + going" },
                { prompt: "Final check: 'Hot weather today'.", correct: "Eeroju enda vaathavaranam", meaning: "Today hot weather", hint: "Today + heat + weather" }
            ]
        },
        {
            scenario: "Slang & Fillers",
            vocabulary: [
                { word: "Kada", meaning: "Right?", phonetic: "kah-dah" },
                { word: "Chudu", meaning: "Look/See", phonetic: "choo-doo" },
                { word: "Sare", meaning: "Okay", phonetic: "sah-reh" },
                { word: "Adhi", meaning: "That/Um", phonetic: "ah-dhee" },
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
                { word: "Perigaanu", meaning: "Grew up", phonetic: "peh-ree-gah-noo" },
                { word: "Matladagalanu", meaning: "Can speak", phonetic: "mat-lah-dah-gah-lah-noo" },
                { word: "Santhoshamga", meaning: "Happily", phonetic: "san-tho-sham-gah" },
                { word: "Telugu", meaning: "Telugu", phonetic: "teh-loo-goo" },
                { word: "Nenu", meaning: "I", phonetic: "neh-noo" }
            ],
            phrases: [
                { prompt: "Say 'I can speak Telugu'", correct: "Nenu Telugu matladagalanu", meaning: "I can speak Telugu", hint: "I + Telugu + speak + can" },
                { prompt: "Say 'I am speaking happily'", correct: "Nenu santhoshamga matladuthunnanu", meaning: "I happily speaking", hint: "I + happily + speaking" },
                { prompt: "Say 'This is my final' (Idhi naa final)", correct: "Idhi naa final", meaning: "This is my final", hint: "This + my + final" }
            ],
            conversations: [
                { prompt: "Tell Miko your full story: 'Hello, I am Ravi, I can speak Telugu.'", correct: "Namaskaram, nenu Ravi, nenu Telugu matladagalanu", meaning: "Hello, I am Ravi, I can speak Telugu", hint: "Greeting + I + Name + I + Telugu + speak can" },
                { prompt: "Say 'I am very happy today'.", correct: "Eeroju nenu baga santhosham", meaning: "Today I am very happy", hint: "Today + I + well + happy" },
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
                { word: "Chennagiddini", meaning: "Fine", phonetic: "chen-nah-geed-dee-nee" },
                { word: "Hege", meaning: "How", phonetic: "heh-geh" }
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
                { word: "Idu", meaning: "This", phonetic: "ee-doo" },
                { word: "Adu", meaning: "That", phonetic: "ah-doo" },
                { word: "Yenu", meaning: "What", phonetic: "yeh-noo" },
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
                { word: "Yelli", meaning: "Where", phonetic: "yel-lee" },
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
                { word: "Haudu", meaning: "Yes", phonetic: "how-doo" }
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
                { word: "Avara", meaning: "His/Her (formal)", phonetic: "ah-vah-rah" },
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
    ]
};

const placeholders = CURRICULUM.Telugu.slice(5).map(s => ({
    ...s,
    scenario: s.scenario + " (Placeholder)",
    vocabulary: s.vocabulary.map(v => ({ ...v, word: v.word + "*" })),
    phrases: s.phrases.map(p => ({ ...p, correct: p.correct + "*" })),
    conversations: s.conversations.map(c => ({ ...c, correct: c.correct + "*" }))
}));

CURRICULUM.Kannada.push(...placeholders);
CURRICULUM.Hindi.push(...placeholders);
