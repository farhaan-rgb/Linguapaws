export const CURRICULUM = {
    Telugu: [
        {
            scenario: "Greetings & Identity",
            vocabulary: [
                { word: "Namaskaram", meaning: "Hello", phonetic: "nah-mas-kah-ram" },
                { word: "Peru", meaning: "Name", phonetic: "peh-roo" },
                { word: "Nenu", meaning: "I", phonetic: "neh-noo" },
                { word: "Meeru", meaning: "You", phonetic: "mee-roo" },
                { word: "Emiti", meaning: "What", phonetic: "eh-mee-tee" },
                { word: "Ekkada", meaning: "Where", phonetic: "ek-kah-dah" },
                { word: "Nundi", meaning: "From", phonetic: "noon-dee" },
                { word: "Avunu", meaning: "Yes", phonetic: "ah-voo-noo" },
                { word: "Ledu", meaning: "No", phonetic: "leh-doo" },
                { word: "Bagunna", meaning: "I am fine", phonetic: "bah-goon-nah" }
            ],
            phrases: [
                {
                    prompt: "How do you say 'I am fine'?",
                    correct: "Nenu bagunna",
                    meaning: "I am fine",
                    hint: "Combine: I + am fine → Nenu + bagunna"
                },
                {
                    prompt: "Ask someone 'What is your name?'",
                    correct: "Mee peru emiti?",
                    meaning: "What is your name?",
                    hint: "Your + name + what? → Mee + peru + emiti? Grammar: 'Mee' is the possessive form of 'Meeru' (you → your)"
                },
                {
                    prompt: "Say 'I am from Hyderabad'",
                    correct: "Nenu Hyderabad nundi",
                    meaning: "I am from Hyderabad",
                    hint: "I + [place] + from → Nenu + Hyderabad + nundi. Grammar: 'nundi' is a postposition — it comes AFTER the place name, not before"
                },
                {
                    prompt: "Ask someone 'Where are you from?'",
                    correct: "Meeru ekkada nundi?",
                    meaning: "Where are you from?",
                    hint: "You + where + from? → Meeru + ekkada + nundi?"
                },
                {
                    prompt: "Say 'Yes, I am fine'",
                    correct: "Avunu, nenu bagunna",
                    meaning: "Yes, I am fine",
                    hint: "Yes + I + am fine → Avunu + nenu + bagunna"
                },
                {
                    prompt: "Greet someone and ask their name",
                    correct: "Namaskaram, mee peru emiti?",
                    meaning: "Hello, what is your name?",
                    hint: "Hello + your + name + what? → Namaskaram + mee + peru + emiti?"
                },
                {
                    prompt: "Say 'I am fine, and you?'",
                    correct: "Nenu bagunna, meeru?",
                    meaning: "I am fine, and you?",
                    hint: "I + am fine + you? → Nenu + bagunna + meeru?"
                },
                {
                    prompt: "Say 'No, I am from Hyderabad'",
                    correct: "Ledu, nenu Hyderabad nundi",
                    meaning: "No, I am from Hyderabad",
                    hint: "No + I + [place] + from → Ledu + nenu + Hyderabad + nundi"
                },
                {
                    prompt: "Say 'Hello, I am fine'",
                    correct: "Namaskaram, nenu bagunna",
                    meaning: "Hello, I am fine",
                    hint: "Hello + I + am fine → Namaskaram + nenu + bagunna"
                },
                {
                    prompt: "Full introduction: 'Hello, I am from Hyderabad'",
                    correct: "Namaskaram, nenu Hyderabad nundi",
                    meaning: "Hello, I am from Hyderabad",
                    hint: "Hello + I + [place] + from → Namaskaram + nenu + Hyderabad + nundi"
                }
            ],
            conversations: [
                {
                    prompt: "Someone greets you and asks your name. Introduce yourself as Ravi.",
                    correct: "Namaskaram, nenu Ravi",
                    meaning: "Hello, I am Ravi",
                    hint: "Hello + I + [name] → Namaskaram + nenu + Ravi"
                },
                {
                    prompt: "Someone asks 'Meeru ekkada nundi?' — answer that you are from Chennai.",
                    correct: "Nenu Chennai nundi",
                    meaning: "I am from Chennai",
                    hint: "I + [city] + from → Nenu + Chennai + nundi"
                },
                {
                    prompt: "Someone asks 'Meeru bagunnaraa?' — say 'Yes, I am fine, and you?'",
                    correct: "Avunu, nenu bagunna, meeru?",
                    meaning: "Yes, I am fine, and you?",
                    hint: "Yes + I + am fine + you? → Avunu + nenu + bagunna + meeru?"
                },
                {
                    prompt: "Greet someone, introduce yourself as Priya, and say you're from Hyderabad.",
                    correct: "Namaskaram, nenu Priya, nenu Hyderabad nundi",
                    meaning: "Hello, I am Priya, I am from Hyderabad",
                    hint: "Hello + I + [name] + I + [city] + from → Namaskaram + nenu + Priya + nenu + Hyderabad + nundi"
                },
                {
                    prompt: "Someone asks 'Mee peru emiti?' — say your name is Ravi and ask their name back.",
                    correct: "Nenu Ravi, mee peru emiti?",
                    meaning: "I am Ravi, what is your name?",
                    hint: "I + [name] + your + name + what? → Nenu + Ravi + mee + peru + emiti?"
                },
                {
                    prompt: "Someone asks if you're from Delhi. Say 'No, I am from Hyderabad.'",
                    correct: "Ledu, nenu Hyderabad nundi",
                    meaning: "No, I am from Hyderabad",
                    hint: "No + I + [city] + from → Ledu + nenu + Hyderabad + nundi"
                },
                {
                    prompt: "Complete this full greeting: Say hello, say you're fine, and ask where they are from.",
                    correct: "Namaskaram, nenu bagunna, meeru ekkada nundi?",
                    meaning: "Hello, I am fine, where are you from?",
                    hint: "Hello + I + fine + you + where + from? → Namaskaram + nenu + bagunna + meeru + ekkada + nundi?"
                }
            ]
        },
        {
            scenario: "Ordering Food & Drinks",
            vocabulary: [
                { word: "Coffee", meaning: "Coffee", phonetic: "kaa-fee" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-roo" },
                { word: "Annam", meaning: "Rice/Food", phonetic: "an-nam" },
                { word: "Kavali", meaning: "Want", phonetic: "kah-vah-lee" },
                { word: "Oddhu", meaning: "Don't want", phonetic: "od-dhoo" },
                { word: "Thinu", meaning: "Eat", phonetic: "thee-noo" },
                { word: "Thaagu", meaning: "Drink", phonetic: "thah-goo" },
                { word: "Ruchi", meaning: "Taste", phonetic: "roo-chee" },
                { word: "Ivvandi", meaning: "Give (please)", phonetic: "iv-van-dee" },
                { word: "Bill", meaning: "Bill", phonetic: "bill" }
            ],
            phrases: [
                {
                    prompt: "Say 'I want water'",
                    correct: "Neeru kavali",
                    meaning: "I want water",
                    hint: "Water + want → Neeru + kavali. Grammar: Object comes before verb"
                },
                {
                    prompt: "Say 'I want coffee'",
                    correct: "Coffee kavali",
                    meaning: "I want coffee",
                    hint: "Coffee + want → Coffee + kavali"
                },
                {
                    prompt: "Say 'I don't want coffee'",
                    correct: "Coffee oddhu",
                    meaning: "I don't want coffee",
                    hint: "Coffee + don't want → Coffee + oddhu"
                },
                {
                    prompt: "Say 'Please give water'",
                    correct: "Neeru ivvandi",
                    meaning: "Please give water",
                    hint: "Water + give → Neeru + ivvandi"
                },
                {
                    prompt: "Say 'I want food'",
                    correct: "Annam kavali",
                    meaning: "I want food/rice",
                    hint: "Food + want → Annam + kavali"
                },
                {
                    prompt: "Say 'Please give the bill'",
                    correct: "Bill ivvandi",
                    meaning: "Please give the bill",
                    hint: "Bill + give → Bill + ivvandi"
                },
                {
                    prompt: "Say 'I want coffee, I don't want water'",
                    correct: "Coffee kavali, neeru oddhu",
                    meaning: "I want coffee, I don't want water",
                    hint: "Coffee + want + water + don't want → Coffee kavali, neeru oddhu"
                },
                {
                    prompt: "Say 'Yes, I want coffee'",
                    correct: "Avunu, coffee kavali",
                    meaning: "Yes, I want coffee",
                    hint: "Yes + coffee + want → Avunu + coffee + kavali"
                },
                {
                    prompt: "Say 'No, I don't want food'",
                    correct: "Ledu, annam oddhu",
                    meaning: "No, I don't want food",
                    hint: "No + food + don't want → Ledu + annam + oddhu"
                },
                {
                    prompt: "Say 'I want food, please give water'",
                    correct: "Annam kavali, neeru ivvandi",
                    meaning: "I want food, please give water",
                    hint: "Food + want + water + give → Annam kavali, neeru ivvandi"
                }
            ],
            conversations: [
                {
                    prompt: "A waiter asks what you'd like. Say you want coffee and water.",
                    correct: "Coffee kavali, neeru kavali",
                    meaning: "I want coffee, I want water",
                    hint: "Coffee + want + water + want → Coffee kavali, neeru kavali"
                },
                {
                    prompt: "The waiter offers tea. Say 'No, I want coffee.'",
                    correct: "Ledu, coffee kavali",
                    meaning: "No, I want coffee",
                    hint: "No + coffee + want → Ledu + coffee + kavali"
                },
                {
                    prompt: "Ask the waiter to give you food and the bill.",
                    correct: "Annam ivvandi, bill ivvandi",
                    meaning: "Please give food, please give the bill",
                    hint: "Food + give + bill + give → Annam ivvandi, bill ivvandi"
                },
                {
                    prompt: "The waiter asks if you want more water. Say 'No, I don't want water, please give the bill.'",
                    correct: "Ledu, neeru oddhu, bill ivvandi",
                    meaning: "No, I don't want water, please give the bill",
                    hint: "No + water + don't want + bill + give → Ledu + neeru + oddhu + bill + ivvandi"
                },
                {
                    prompt: "Greet the waiter, then order food and coffee.",
                    correct: "Namaskaram, annam kavali, coffee kavali",
                    meaning: "Hello, I want food, I want coffee",
                    hint: "Hello + food + want + coffee + want → Namaskaram + annam + kavali + coffee + kavali"
                },
                {
                    prompt: "Say you don't want food but want water.",
                    correct: "Annam oddhu, neeru kavali",
                    meaning: "I don't want food, I want water",
                    hint: "Food + don't want + water + want → Annam oddhu + neeru kavali"
                },
                {
                    prompt: "Thank the waiter: say 'Yes, I want the bill, thank you' (use Namaskaram as thanks).",
                    correct: "Avunu, bill ivvandi, namaskaram",
                    meaning: "Yes, please give the bill, thank you",
                    hint: "Yes + bill + give + thank you → Avunu + bill + ivvandi + namaskaram"
                }
            ]
        },
        {
            scenario: "Shopping & Prices",
            vocabulary: [
                { word: "Khareedu", meaning: "Price", phonetic: "khah-ree-doo" },
                { word: "Entha", meaning: "How much", phonetic: "en-thah" },
                { word: "Konali", meaning: "To buy", phonetic: "koh-nah-lee" },
                { word: "Bharam", meaning: "Weight", phonetic: "bhah-ram" },
                { word: "Thakkuva", meaning: "Less", phonetic: "thak-koo-vah" },
                { word: "Ekkuva", meaning: "More", phonetic: "ek-koo-vah" },
                { word: "Baga", meaning: "Very good", phonetic: "bah-gah" },
                { word: "Kotha", meaning: "New", phonetic: "koh-thah" },
                { word: "Patha", meaning: "Old", phonetic: "pah-thah" },
                { word: "Batta", meaning: "Clothes", phonetic: "bat-tah" }
            ]
        },
        {
            scenario: "Asking for Directions",
            vocabulary: [
                { word: "Dhari", meaning: "Way/Path", phonetic: "dhah-ree" },
                { word: "Ekkada", meaning: "Where", phonetic: "ek-kah-dah" },
                { word: "Vellali", meaning: "Must go", phonetic: "vel-lah-lee" },
                { word: "Thirugu", meaning: "Turn", phonetic: "thee-roo-goo" },
                { word: "Kudipakka", meaning: "Right side", phonetic: "koo-dee-pak-kah" },
                { word: "Edamapakka", meaning: "Left side", phonetic: "eh-dah-mah-pak-kah" },
                { word: "Sahaayam", meaning: "Help", phonetic: "sah-hah-yam" },
                { word: "Dhooram", meaning: "Far", phonetic: "dhoo-ram" },
                { word: "Daggara", meaning: "Near", phonetic: "dag-gah-rah" },
                { word: "Agandi", meaning: "Stop", phonetic: "ah-gan-dee" }
            ]
        },
        {
            scenario: "Transportation & Travel",
            vocabulary: [
                { word: "Bandi", meaning: "Vehicle", phonetic: "ban-dee" },
                { word: "Prayanam", meaning: "Travel", phonetic: "prah-yah-nam" },
                { word: "Ticket", meaning: "Ticket", phonetic: "tik-ket" },
                { word: "Samayam", meaning: "Time", phonetic: "sah-mah-yam" },
                { word: "Vellu", meaning: "Go", phonetic: "vel-loo" },
                { word: "Ra", meaning: "Come", phonetic: "rah" },
                { word: "Seat", meaning: "Seat", phonetic: "seet" },
                { word: "Chudu", meaning: "See", phonetic: "choo-doo" },
                { word: "Nadupu", meaning: "Drive", phonetic: "nah-doo-poo" },
                { word: "Paradhu", meaning: "Wait", phonetic: "pah-rah-dhoo" }
            ]
        },
        {
            scenario: "Time & Schedules",
            vocabulary: [
                { word: "Samayam", meaning: "Time", phonetic: "sah-mah-yam" },
                { word: "Ganta", meaning: "Hour", phonetic: "gan-tah" },
                { word: "Eeroju", meaning: "Today", phonetic: "ee-roh-joo" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "reh-poo" },
                { word: "Ninna", meaning: "Yesterday", phonetic: "nin-nah" },
                { word: "Ippudu", meaning: "Now", phonetic: "ip-poo-doo" },
                { word: "Tharuvatha", meaning: "Later", phonetic: "thah-roo-vah-thah" },
                { word: "Appudu", meaning: "Then", phonetic: "ap-poo-doo" },
                { word: "Varam", meaning: "Week", phonetic: "vah-ram" },
                { word: "Nelalu", meaning: "Months", phonetic: "neh-lah-loo" }
            ]
        },
        {
            scenario: "Hobbies & Preferences",
            vocabulary: [
                { word: "Ishtam", meaning: "Like", phonetic: "ish-tam" },
                { word: "Aata", meaning: "Game/Play", phonetic: "ah-tah" },
                { word: "Pata", meaning: "Song", phonetic: "pah-tah" },
                { word: "Cinema", meaning: "Movie", phonetic: "si-neh-mah" },
                { word: "Chadhuvu", meaning: "Read", phonetic: "chah-dhoo-voo" },
                { word: "Rayi", meaning: "Write", phonetic: "rah-yee" },
                { word: "Kushi", meaning: "Happy", phonetic: "koo-shee" },
                { word: "Preethi", meaning: "Love", phonetic: "pree-thee" },
                { word: "Abhiruchi", meaning: "Hobby", phonetic: "ah-bhee-roo-chee" },
                { word: "Santhosham", meaning: "Happiness", phonetic: "san-tho-sham" }
            ]
        },
        {
            scenario: "Weather & Environment",
            vocabulary: [
                { word: "Vaathavaranam", meaning: "Weather", phonetic: "vah-thah-vah-rah-nam" },
                { word: "Enda", meaning: "Sun/Heat", phonetic: "en-dah" },
                { word: "Vana", meaning: "Rain", phonetic: "vah-nah" },
                { word: "Gali", meaning: "Wind", phonetic: "gah-lee" },
                { word: "Chaliga", meaning: "Cold", phonetic: "chah-lee-gah" },
                { word: "Akasam", meaning: "Sky", phonetic: "ah-kah-sam" },
                { word: "Mabbulu", meaning: "Clouds", phonetic: "mab-boo-loo" },
                { word: "Nadi", meaning: "River", phonetic: "nah-dee" },
                { word: "Chettu", meaning: "Tree", phonetic: "chet-too" },
                { word: "Puvvu", meaning: "Flower", phonetic: "poov-voo" }
            ]
        },
        {
            scenario: "Health & Body",
            vocabulary: [
                { word: "Arogyam", meaning: "Health", phonetic: "ah-rohg-yam" },
                { word: "Noppi", meaning: "Pain", phonetic: "nop-pee" },
                { word: "Jwaram", meaning: "Fever", phonetic: "jwah-ram" },
                { word: "Thala", meaning: "Head", phonetic: "thah-lah" },
                { word: "Kallu", meaning: "Eyes", phonetic: "kal-loo" },
                { word: "Cheyi", meaning: "Hand", phonetic: "cheh-yee" },
                { word: "Kalu", meaning: "Leg", phonetic: "kah-loo" },
                { word: "Vaidyudu", meaning: "Doctor", phonetic: "vye-dyoo-doo" },
                { word: "Mandhu", meaning: "Medicine", phonetic: "man-dhoo" },
                { word: "Nidra", meaning: "Sleep", phonetic: "nid-rah" }
            ]
        },
        {
            scenario: "Social Gatherings & Events",
            vocabulary: [
                { word: "Panduga", meaning: "Festival", phonetic: "pan-doo-gah" },
                { word: "Pelli", meaning: "Wedding", phonetic: "pel-lee" },
                { word: "Vinodam", meaning: "Party/Fun", phonetic: "vee-noh-dam" },
                { word: "Snehithudu", meaning: "Friend", phonetic: "sneh-hee-thoo-doo" },
                { word: "Bandhuvu", meaning: "Relative", phonetic: "ban-dhoo-voo" },
                { word: "Aahaaram", meaning: "Feast/Food", phonetic: "ah-hah-ram" },
                { word: "Mata", meaning: "Word/Speech", phonetic: "mah-tah" },
                { word: "Navvu", meaning: "Laugh", phonetic: "nav-voo" },
                { word: "Uthsavam", meaning: "Celebration", phonetic: "ooth-sah-vam" },
                { word: "Aanandam", meaning: "Joy", phonetic: "ah-nan-dam" }
            ]
        }
    ],
    Kannada: [
        {
            scenario: "Greetings & Identity",
            vocabulary: [
                { word: "Namaskara", meaning: "Hello", phonetic: "nah-mas-kah-rah" },
                { word: "Hesaru", meaning: "Name", phonetic: "heh-sah-roo" },
                { word: "Naanu", meaning: "I", phonetic: "nah-noo" },
                { word: "Neevu", meaning: "You", phonetic: "nee-voo" },
                { word: "Yenu", meaning: "What", phonetic: "yeh-noo" },
                { word: "Yelli", meaning: "Where", phonetic: "yel-lee" },
                { word: "Inda", meaning: "From", phonetic: "in-dah" },
                { word: "Haudhu", meaning: "Yes", phonetic: "how-dhoo" },
                { word: "Illa", meaning: "No", phonetic: "il-lah" },
                { word: "Chennagidini", meaning: "Fine/Good", phonetic: "chen-nah-gee-dee-nee" }
            ]
        },
        {
            scenario: "Ordering Food & Drinks",
            vocabulary: [
                { word: "Coffee", meaning: "Coffee", phonetic: "kaa-fee" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-roo" },
                { word: "Oota", meaning: "Food/Meal", phonetic: "oo-tah" },
                { word: "Beku", meaning: "Want", phonetic: "beh-koo" },
                { word: "Beda", meaning: "Don't want", phonetic: "beh-dah" },
                { word: "Tinnu", meaning: "Eat", phonetic: "tin-noo" },
                { word: "Kudi", meaning: "Drink", phonetic: "koo-dee" },
                { word: "Ruchi", meaning: "Taste", phonetic: "roo-chee" },
                { word: "Kodi", meaning: "Give", phonetic: "koh-dee" },
                { word: "Bill", meaning: "Bill", phonetic: "bill" }
            ]
        },
        {
            scenario: "Shopping & Prices",
            vocabulary: [
                { word: "Bele", meaning: "Price", phonetic: "beh-leh" },
                { word: "Eshtu", meaning: "How much", phonetic: "esh-too" },
                { word: "Kollalu", meaning: "To buy", phonetic: "kol-lah-loo" },
                { word: "Tooka", meaning: "Weight", phonetic: "too-kah" },
                { word: "Kudime", meaning: "Less", phonetic: "koo-dee-meh" },
                { word: "Jaasti", meaning: "More", phonetic: "jaas-tee" },
                { word: "Olledu", meaning: "Good", phonetic: "ol-leh-doo" },
                { word: "Hosa", meaning: "New", phonetic: "hoh-sah" },
                { word: "Hale", meaning: "Old", phonetic: "hah-leh" },
                { word: "Batte", meaning: "Clothes", phonetic: "bat-teh" }
            ]
        },
        {
            scenario: "Asking for Directions", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Daari", meaning: "Way/Path", phonetic: "dah-ree" },
                { word: "Yelli", meaning: "Where", phonetic: "yel-lee" },
                { word: "Hogbeku", meaning: "Must go", phonetic: "hohg-beh-koo" },
                { word: "Thirugu", meaning: "Turn", phonetic: "thee-roo-goo" },
                { word: "Balapakka", meaning: "Right side", phonetic: "bah-lah-pak-kah" },
                { word: "Edapakka", meaning: "Left side", phonetic: "eh-dah-pak-kah" },
                { word: "Sahaya", meaning: "Help", phonetic: "sah-hah-yah" },
                { word: "Doora", meaning: "Far", phonetic: "doo-rah" },
                { word: "Hathira", meaning: "Near", phonetic: "hah-thee-rah" },
                { word: "Nillu", meaning: "Stop", phonetic: "nil-loo" }
            ][i])
        },
        {
            scenario: "Transportation & Travel", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Gaadi", meaning: "Vehicle", phonetic: "gah-dee" },
                { word: "Prayana", meaning: "Travel", phonetic: "prah-yah-nah" },
                { word: "Ticket", meaning: "Ticket", phonetic: "tik-ket" },
                { word: "Samaya", meaning: "Time", phonetic: "sah-mah-yah" },
                { word: "Hogu", meaning: "Go", phonetic: "hoh-goo" },
                { word: "Baa", meaning: "Come", phonetic: "bah" },
                { word: "Seat", meaning: "Seat", phonetic: "seet" },
                { word: "Nodu", meaning: "See", phonetic: "noh-doo" },
                { word: "Odisu", meaning: "Drive", phonetic: "oh-dee-soo" },
                { word: "Kaayiri", meaning: "Wait", phonetic: "kah-yee-ree" }
            ][i])
        },
        {
            scenario: "Time & Schedules", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Samaya", meaning: "Time", phonetic: "sah-mah-yah" },
                { word: "Gante", meaning: "Hour", phonetic: "gan-teh" },
                { word: "Ivattu", meaning: "Today", phonetic: "ee-vat-too" },
                { word: "Naale", meaning: "Tomorrow", phonetic: "nah-leh" },
                { word: "Ninne", meaning: "Yesterday", phonetic: "nin-neh" },
                { word: "Eega", meaning: "Now", phonetic: "ee-gah" },
                { word: "Amele", meaning: "Later", phonetic: "ah-meh-leh" },
                { word: "Aaga", meaning: "Then", phonetic: "ah-gah" },
                { word: "Vaara", meaning: "Week", phonetic: "vah-rah" },
                { word: "Tingalu", meaning: "Months", phonetic: "tin-gah-loo" }
            ][i])
        },
        {
            scenario: "Hobbies & Preferences", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Ishta", meaning: "Like", phonetic: "ish-tah" },
                { word: "Aata", meaning: "Game/Play", phonetic: "ah-tah" },
                { word: "Haadu", meaning: "Song", phonetic: "hah-doo" },
                { word: "Cinema", meaning: "Movie", phonetic: "si-neh-mah" },
                { word: "Odu", meaning: "Read", phonetic: "oh-doo" },
                { word: "Bareyiri", meaning: "Write", phonetic: "bah-reh-yee-ree" },
                { word: "Khushi", meaning: "Happy", phonetic: "koo-shee" },
                { word: "Preeti", meaning: "Love", phonetic: "pree-tee" },
                { word: "Hobby", meaning: "Hobby", phonetic: "hob-bee" },
                { word: "Santhosha", meaning: "Happiness", phonetic: "san-tho-shah" }
            ][i])
        },
        {
            scenario: "Weather & Environment", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Hawaamana", meaning: "Weather", phonetic: "hah-wah-mah-nah" },
                { word: "Bisi", meaning: "Hot", phonetic: "bee-see" },
                { word: "Male", meaning: "Rain", phonetic: "mah-leh" },
                { word: "Gaali", meaning: "Wind", phonetic: "gah-lee" },
                { word: "Thandi", meaning: "Cold", phonetic: "than-dee" },
                { word: "Aakasha", meaning: "Sky", phonetic: "ah-kah-shah" },
                { word: "Megha", meaning: "Cloud", phonetic: "meh-gah" },
                { word: "Nadi", meaning: "River", phonetic: "nah-dee" },
                { word: "Mara", meaning: "Tree", phonetic: "mah-rah" },
                { word: "Hoovu", meaning: "Flower", phonetic: "hoo-voo" }
            ][i])
        },
        {
            scenario: "Health & Body", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Arogya", meaning: "Health", phonetic: "ah-rohg-yah" },
                { word: "Novu", meaning: "Pain", phonetic: "noh-voo" },
                { word: "Jwara", meaning: "Fever", phonetic: "jwah-rah" },
                { word: "Tale", meaning: "Head", phonetic: "tah-leh" },
                { word: "Kannu", meaning: "Eye", phonetic: "kan-noo" },
                { word: "Kai", meaning: "Hand", phonetic: "kah-ee" },
                { word: "Kaalu", meaning: "Leg", phonetic: "kah-loo" },
                { word: "Vaidya", meaning: "Doctor", phonetic: "vye-dyah" },
                { word: "Oushadha", meaning: "Medicine", phonetic: "ow-shah-dhah" },
                { word: "Nidre", meaning: "Sleep", phonetic: "nid-reh" }
            ][i])
        },
        {
            scenario: "Social Gatherings & Events", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Habba", meaning: "Festival", phonetic: "hab-bah" },
                { word: "Maduve", meaning: "Wedding", phonetic: "mah-doo-veh" },
                { word: "Party", meaning: "Party", phonetic: "par-tee" },
                { word: "Geleya", meaning: "Friend", phonetic: "geh-leh-yah" },
                { word: "Bandhu", meaning: "Relative", phonetic: "ban-dhoo" },
                { word: "Oota", meaning: "Feast", phonetic: "oo-tah" },
                { word: "Maatu", meaning: "Word", phonetic: "mah-too" },
                { word: "Nagu", meaning: "Laugh", phonetic: "nah-goo" },
                { word: "Utsava", meaning: "Celebration", phonetic: "ooth-sah-vah" },
                { word: "Ananda", meaning: "Joy", phonetic: "ah-nan-dah" }
            ][i])
        }
    ],
    Hindi: [
        {
            scenario: "Greetings & Identity",
            vocabulary: [
                { word: "Namaste", meaning: "Hello", phonetic: "nah-mas-tey" },
                { word: "Naam", meaning: "Name", phonetic: "nahm" },
                { word: "Main", meaning: "I", phonetic: "mayn" },
                { word: "Aap", meaning: "You", phonetic: "ahp" },
                { word: "Kya", meaning: "What", phonetic: "kyah" },
                { word: "Kahan", meaning: "Where", phonetic: "kah-hahn" },
                { word: "Se", meaning: "From", phonetic: "seh" },
                { word: "Haan", meaning: "Yes", phonetic: "hahn" },
                { word: "Nahi", meaning: "No", phonetic: "nah-hee" },
                { word: "Theek", meaning: "Fine/Okay", phonetic: "theek" }
            ]
        },
        {
            scenario: "Ordering Food & Drinks",
            vocabulary: [
                { word: "Coffee", meaning: "Coffee", phonetic: "kaa-fee" },
                { word: "Paani", meaning: "Water", phonetic: "pah-nee" },
                { word: "Khana", meaning: "Food", phonetic: "khah-nah" },
                { word: "Chahiye", meaning: "Want", phonetic: "chah-hee-yeh" },
                { word: "Nahi", meaning: "No/Not", phonetic: "nah-hee" },
                { word: "Khao", meaning: "Eat", phonetic: "khah-oh" },
                { word: "Piyo", meaning: "Drink", phonetic: "pee-yoh" },
                { word: "Swad", meaning: "Taste", phonetic: "swahd" },
                { word: "Dijiye", meaning: "Give", phonetic: "dee-jee-yeh" },
                { word: "Bill", meaning: "Bill", phonetic: "bill" }
            ]
        },
        {
            scenario: "Shopping & Prices", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Daam", meaning: "Price", phonetic: "dahm" },
                { word: "Kitna", meaning: "How much", phonetic: "kit-nah" },
                { word: "Kharidna", meaning: "To buy", phonetic: "khah-rid-nah" },
                { word: "Wajan", meaning: "Weight", phonetic: "vah-jan" },
                { word: "Kam", meaning: "Less", phonetic: "kahm" },
                { word: "Zyada", meaning: "More", phonetic: "zyah-dah" },
                { word: "Achha", meaning: "Good", phonetic: "ach-hah" },
                { word: "Naya", meaning: "New", phonetic: "nah-yah" },
                { word: "Purana", meaning: "Old", phonetic: "poo-rah-nah" },
                { word: "Kapde", meaning: "Clothes", phonetic: "kap-deh" }
            ][i])
        },
        {
            scenario: "Asking for Directions", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Rasta", meaning: "Path", phonetic: "ras-tah" },
                { word: "Kahan", meaning: "Where", phonetic: "kah-hahn" },
                { word: "Jaana", meaning: "To go", phonetic: "jah-nah" },
                { word: "Mudna", meaning: "Turn", phonetic: "mood-nah" },
                { word: "Daayein", meaning: "Right", phonetic: "dah-yein" },
                { word: "Baayein", meaning: "Left", phonetic: "bah-yein" },
                { word: "Madad", meaning: "Help", phonetic: "mah-dad" },
                { word: "Door", meaning: "Far", phonetic: "doo-r" },
                { word: "Paas", meaning: "Near", phonetic: "pahs" },
                { word: "Ruko", meaning: "Stop", phonetic: "roo-koh" }
            ][i])
        },
        {
            scenario: "Transportation & Travel", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Gadi", meaning: "Vehicle", phonetic: "gah-dee" },
                { word: "Safar", meaning: "Travel", phonetic: "sah-far" },
                { word: "Ticket", meaning: "Ticket", phonetic: "tik-ket" },
                { word: "Samay", meaning: "Time", phonetic: "sah-may" },
                { word: "Chalo", meaning: "Go", phonetic: "chah-loh" },
                { word: "Aao", meaning: "Come", phonetic: "ah-oh" },
                { word: "Seat", meaning: "Seat", phonetic: "seet" },
                { word: "Dekho", meaning: "See", phonetic: "deh-khoh" },
                { word: "Chalao", meaning: "Drive", phonetic: "chah-lah-oh" },
                { word: "Ruko", meaning: "Wait", phonetic: "roo-koh" }
            ][i])
        },
        {
            scenario: "Time & Schedules", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Samay", meaning: "Time", phonetic: "sah-may" },
                { word: "Ghanta", meaning: "Hour", phonetic: "ghan-tah" },
                { word: "Aaj", meaning: "Today", phonetic: "ahj" },
                { word: "Kal", meaning: "Tomorrow", phonetic: "kal" },
                { word: "Kal", meaning: "Yesterday", phonetic: "kal" },
                { word: "Abhi", meaning: "Now", phonetic: "ah-bhee" },
                { word: "Baad", meaning: "Later", phonetic: "bahd" },
                { word: "Tab", meaning: "Then", phonetic: "tab" },
                { word: "Hafta", meaning: "Week", phonetic: "haf-tah" },
                { word: "Maheena", meaning: "Month", phonetic: "mah-hee-nah" }
            ][i])
        },
        {
            scenario: "Hobbies & Preferences", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Pasand", meaning: "Like", phonetic: "pah-sand" },
                { word: "Khel", meaning: "Game", phonetic: "khel" },
                { word: "Gaana", meaning: "Song", phonetic: "gah-nah" },
                { word: "Film", meaning: "Movie", phonetic: "film" },
                { word: "Padho", meaning: "Read", phonetic: "pah-dhoh" },
                { word: "Likho", meaning: "Write", phonetic: "likh-oh" },
                { word: "Khush", meaning: "Happy", phonetic: "khoosh" },
                { word: "Pyaar", meaning: "Love", phonetic: "pyahr" },
                { word: "Shauk", meaning: "Hobby", phonetic: "showk" },
                { word: "Khushi", meaning: "Happiness", phonetic: "khoo-shee" }
            ][i])
        },
        {
            scenario: "Weather & Environment", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Mausam", meaning: "Weather", phonetic: "mow-sam" },
                { word: "Dhoop", meaning: "Sunshine", phonetic: "dhoop" },
                { word: "Baarish", meaning: "Rain", phonetic: "bah-rish" },
                { word: "Hawa", meaning: "Wind", phonetic: "hah-wah" },
                { word: "Thanda", meaning: "Cold", phonetic: "than-dah" },
                { word: "Aasman", meaning: "Sky", phonetic: "ahs-mahn" },
                { word: "Badal", meaning: "Cloud", phonetic: "bah-dal" },
                { word: "Nadi", meaning: "River", phonetic: "nah-dee" },
                { word: "Ped", meaning: "Tree", phonetic: "pehd" },
                { word: "Phool", meaning: "Flower", phonetic: "phool" }
            ][i])
        },
        {
            scenario: "Health & Body", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Swasthya", meaning: "Health", phonetic: "swas-thyah" },
                { word: "Dard", meaning: "Pain", phonetic: "dar-d" },
                { word: "Bukhar", meaning: "Fever", phonetic: "boo-khar" },
                { word: "Sir", meaning: "Head", phonetic: "sir" },
                { word: "Aankh", meaning: "Eye", phonetic: "ahnkh" },
                { word: "Haath", meaning: "Hand", phonetic: "hahth" },
                { word: "Pair", meaning: "Leg", phonetic: "payr" },
                { word: "Doctor", meaning: "Doctor", phonetic: "doc-tor" },
                { word: "Dawai", meaning: "Medicine", phonetic: "dah-wah-ee" },
                { word: "Neend", meaning: "Sleep", phonetic: "neend" }
            ][i])
        },
        {
            scenario: "Social Gatherings & Events", vocabulary: Array.from({ length: 10 }, (_, i) => [
                { word: "Tyohar", meaning: "Festival", phonetic: "tyoh-har" },
                { word: "Shaadi", meaning: "Wedding", phonetic: "shah-dee" },
                { word: "Party", meaning: "Party", phonetic: "par-tee" },
                { word: "Dost", meaning: "Friend", phonetic: "dohst" },
                { word: "Rishtedaar", meaning: "Relative", phonetic: "rish-teh-dahr" },
                { word: "Dawat", meaning: "Feast", phonetic: "dah-wat" },
                { word: "Baat", meaning: "Talk", phonetic: "baht" },
                { word: "Hansi", meaning: "Laugh", phonetic: "han-see" },
                { word: "Jashn", meaning: "Celebration", phonetic: "jash-n" },
                { word: "Khushi", meaning: "Joy", phonetic: "khoo-shee" }
            ][i])
        }
    ]
};
