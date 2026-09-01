/* Phonetic guides use one consistent scheme, because vowel length is phonemic in
   Telugu and Kannada and the previous guides wrote "ah" for both short a and
   long aa, and "eh" for both short e and long ee:

     short a -> uh      long aa -> aa
     short i -> ih      long ii -> ee
     short u -> u       long uu -> oo
     short e -> eh      long ee -> ay
     short o -> o       long oo -> oh

   All 30 Telugu lessons and all of Kannada now follow it. Telugu L11-L30 used
   to carry the older guides, which wrote "nah" for both short and long a and
   "noo" for a short u — so *Chesanu* was hinted "cheh-sah-noo" when it is
   chay-saa-nu, and every playtester's typos came from working off a hint that
   disagreed with the spelling they had to type. */
export const CURRICULUM = {
    Telugu: [
        // Phase 1: The Foundation (Lessons 1–10)
        {
            scenario: "Pronouns & Greetings",
            icon: "👋",
            color: "#e0f2fe",
            vocabulary: [
                { word: "Namaskaram", meaning: "Hello", phonetic: "nuh-mus-kaa-rum", alt: ["namaste"] },
                { word: "Nenu", meaning: "I", phonetic: "nay-nu" },
                { word: "Meeru", meaning: "You", phonetic: "mee-ru", alt: ["nuvvu"] },
                { word: "Unnaru", meaning: "You are", phonetic: "un-naa-ru", alt: ["unnavu"],
                  teach: "“You are” is {w} — the polite form, for anyone you would call *Meeru*." },
                { word: "Bagunnanu", meaning: "I'm fine", phonetic: "baa-gun-naa-nu", alt: ["bagunna"] },
                { word: "Ela", meaning: "How", phonetic: "eh-laa" }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskaram, nenu bagunnanu", meaning: "Hello, I am fine", hint: "Hello + I + fine", acceptable: ["namaskaram, nenu bagunna", "namaskaram bagunnanu", "namaskaram bagunna"],
                  grammarNote: "*Bagunnanu* is two pieces joined: *baga* (\"well\") plus *unnanu* (\"I am\") — the final vowel of *baga* drops away where they meet. That is why there is no separate word for \"am\" — and why the clipped *bagunna* you hear in fast speech still means the same thing." },
                { prompt: "Ask 'How are you?'", correct: "Meeru ela unnaru", meaning: "How are you?", hint: "You + how + are?", acceptable: ["meeru ela unnaru?", "meeru ela", "ela unnaru", "ela unnaru?"],
                  grammarNote: "*Unnaru* is “you are”, and the ending is what carries the person. *Unnanu* is “I am” — the one hiding inside *bagunnanu* — while *unnaru* covers anyone you would call *meeru*. It doubles as the respectful “he is” and “she is”, and a close friend gets *unnavu*." },
                { prompt: "Say 'I'm fine — you?'", correct: "Nenu bagunnanu, meeru?", meaning: "I am fine, and you?", hint: "I + fine + you?", acceptable: ["nenu bagunna, meeru?", "bagunnanu, meeru?", "bagunna, meeru?"],
                  grammarNote: "Telugu usually drops *nenu* — *bagunnanu* already means \"I am fine\" on its own. This sentence is the exception: setting yourself beside the other person is exactly the contrast Telugu marks with the pronoun, so *Nenu bagunnanu, meeru?* is the natural form here — \"**I'm** fine, and you?\"." }
            ],
            conversations: [
                { prompt: "A shopkeeper greets you. Say hello and that you are fine.", correct: "Namaskaram, nenu bagunnanu", meaning: "Hello, I am fine", hint: "Basic greeting + state", acceptable: ["namaskaram, nenu bagunna", "namaskaram bagunnanu", "namaskaram bagunna"],
                  grammarNote: "Swap that -nu ending and the subject changes: *bagunnaru* means \"you are fine\". Same word, different ending, different person — you will meet this pattern on every Telugu verb." },
                { prompt: "Ask Miko how they are doing — start with their name.", correct: "Miko, meeru ela", meaning: "Miko, how are you?", hint: "Name + you + how + are?",
                  acceptable: ["meeru ela unnaru?", "meeru ela", "ela unnaru?"],
                  acceptable: ["miko, meeru ela unnaru?", "miko meeru ela unnaru", "miko, meeru ela unnaru", "miko meeru ela unnaru?"],
                  grammarNote: "Leading with the name — *Miko, meeru ela...* — is as normal in Telugu as in English. Ending with *unnaru* gives you the polite full form." },
                { prompt: "Someone asks how you are. Answer: 'I am fine'.", correct: "Nenu bagunnanu", meaning: "I am fine", hint: "Direct answer", acceptable: ["nenu bagunna", "bagunnanu", "bagunna"],
                  grammarNote: "In relaxed speech people clip this to *bagunna*, dropping the -nu. You will hear both, and either is accepted here." },
                { prompt: "Say hello, tell them you are fine, and ask how they are.", correct: "Namaskaram, nenu bagunnanu. Meeru ela", meaning: "Hello, I am fine, how are you?", hint: "Full intro",
                  acceptable: ["namaskaram, nenu bagunna. meeru ela", "namaskaram, nenu bagunnanu. meeru ela unnaru?", "namaskaram, nenu bagunna. meeru ela unnaru?", "namaskaram nenu bagunna meeru ela unnaru?", "namaskaram, nenu bagunna. meeru ela unnaru"],
                  grammarNote: "That is the whole greeting exchange in one go — greeting, how you are, and the question back. *Unnaru* on the end is the polite \"are\"; you will be understood with or without it." }
            ]
        },
        {
            scenario: "The 'What' & 'This/That'",
            vocabulary: [
                { word: "Idhi", meaning: "This", phonetic: "ih-dhih", teach: "“This” is {w}." },
                { word: "Adhi", meaning: "That", phonetic: "uh-dhih", teach: "“That” is {w} — something further away." },
                { word: "Ee", meaning: "This (before a noun)", phonetic: "ee",
                  teach: "Before a noun, “this” changes shape: {w}. *Idhi* stands alone — *idhi pusthakam*, “this is a book” — while *ee* leans on the noun after it: *ee pusthakam*, “this book”. Not a matter of distance; that is *idhi* against *adhi*. And *adhi* shortens the same way, to *aa*." },
                { word: "Emiti", meaning: "What", phonetic: "ay-mih-ti", teach: "“What” is {w}. In quick speech it shortens to *enti* or just *em*, all the same word.", alt: ["enti", "emi", "em"] },
                { word: "Pusthakam", meaning: "Book", phonetic: "pus-tuh-kum" },
                { word: "Peru", meaning: "Name", phonetic: "pay-ru" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Idhi emiti?", grammarNote: "The question word goes LAST in Telugu, where English puts it first. So *emiti* closes the sentence, and the pointing word — *idhi* or *adhi* — opens it.", meaning: "What is this?", hint: "This + what?" },
                { prompt: "Say 'This is a book'", correct: "Idhi pusthakam", meaning: "This is a book", hint: "This + book" },
                { prompt: "Say 'This book'", correct: "Ee pusthakam", meaning: "This book", hint: "This(+noun) + book",
                  grammarNote: "Two words, no verb — *ee pusthakam* names a thing, it does not say anything about it yet. Put *idhi* in front instead and you get a whole sentence: *idhi pusthakam*, “this is a book”. That is the difference the two forms carry, and it is not about distance." }
            ],
            conversations: [
                { prompt: "Say hello (from last lesson), and ask 'What is this?'", correct: "Namaskaram, idhi emiti?", meaning: "Hello, what is this?", hint: "Hello + this + what?" },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Adhi emiti?", meaning: "What is that?", hint: "Distant question" },
                { prompt: "Tell Miko 'This is a book'", correct: "Idhi pusthakam", meaning: "This is a book", hint: "Simple statement" },
                { prompt: "Ask a stranger what their name is using words you know.", correct: "Meeru peru emiti?", meaning: "What is your name?", hint: "You + name + what?", acceptable: ["mee peru emiti?"],
                  grammarNote: "This is the casual spoken run-together — *You + Name + What*. The tidier form uses the possessive *mee* (“your”), which you meet in lesson 5: *Mee peru emiti?* Both are accepted here." }
            ]
        },
        {
            scenario: "The 'Where' & 'Going'",
            vocabulary: [
                { word: "Ekkada", meaning: "Where", phonetic: "ehk-kuh-duh", teach: "“Where” is {w}." },
                { word: "Vellu", meaning: "Go", phonetic: "vehl-lu", alt: ["vellandi"],
                  teach: "“Go” is {w}. Telling someone politely to go, you add -andi: *vellandi*. Telugu adds that -andi to soften any command, and you will meet it again on other verbs." },
                { word: "Undi", meaning: "It is / there is", phonetic: "un-dih",
                  teach: "{w} is “it is” or “there is”, used for one thing rather than for people. It closes a sentence that says where something is, and you will put it to work later in this lesson." },
                { word: "Ikkada", meaning: "Here", phonetic: "ihk-kuh-duh" },
                { word: "Akkada", meaning: "There", phonetic: "uhk-kuh-duh" },
                { word: "Illu", meaning: "House", phonetic: "ihl-lu", alt: ["inti", "intiki"],
                  teach: "“House” is {w}. Going TO it, the word reshapes and takes -ki: *intiki*. Telugu does that to most nouns before an ending, so *pani* (“work”) becomes *paniki*, “to work”." }
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Illu ekkada?", grammarNote: "*Ekkada* went to the end. Every Telugu question word does, where English puts it at the front.", meaning: "Where is the house?", hint: "House + where?", acceptable: ["inti ekkada?"] },
                { prompt: "Say 'I am going to the house'", correct: "Nenu intiki velthunnanu", meaning: "I am going to the house", hint: "I + to the house + am going", acceptable: ["nenu intiki vellu", "intiki velthunnanu"],
                  grammarNote: "There it is in use: *illu* reshaped to *inti* and took -ki for “to”. That -ki is how Telugu marks a destination, and it goes on the noun, never before it." },
                { prompt: "Say 'Go there'", correct: "Akkada vellandi", meaning: "Go there", hint: "There + go" }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Illu ekkada?", meaning: "Where is the home?", hint: "Location question", acceptable: ["inti ekkada?"] },
                { prompt: "Tell someone to go there.", correct: "Akkada vellandi", meaning: "Go there", hint: "Direction" },
                { prompt: "Someone asks 'Meeru ekkada?'. Connect 'I am here' with 'You?' (from Scenario 1).", correct: "Nenu ikkada, meeru?", meaning: "I am here, and you?", hint: "I + here + you?" },
                { prompt: "Say 'The house is there'.", correct: "Illu akkada undi", meaning: "The house is there", hint: "House + there + is", acceptable: ["inti akkada undi"],
                  grammarNote: "The verb goes last — Telugu is Subject, Object, Verb throughout. *Undi* is doing real work here: without it *illu akkada* is just “house there”, and it is *undi* that makes it a statement that something IS somewhere." }
            ]
        },
        {
            scenario: "Desires & Negation",
            vocabulary: [
                { word: "Kaavali", meaning: "Want", phonetic: "kaa-vaa-lih" },
                { word: "Oddu", meaning: "Don't want", phonetic: "od-du" },
                { word: "Annam", meaning: "Food", phonetic: "un-num" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-ru" },
                { word: "Sare", meaning: "Okay", phonetic: "suh-ray" }
            ],
            phrases: [
                { prompt: "Say 'I want water'", correct: "Neeru kaavali", meaning: "I want water", hint: "Water + want",
                  grammarNote: "Two words and no “I”. *Kaavali* means “is wanted”, so the thing wanted comes first and the person is left to context — *neeru kaavali* is how you ask for water in a shop, in a home, anywhere. You will meet *naaku neeru kaavali* (“to me water is wanted”) when you want to be explicit." },
                { prompt: "Say 'I don't want food'", correct: "Annam oddu", meaning: "I don't want food", hint: "Food + don't want",
                  grammarNote: "*Oddu* is not “no” — it is a whole refusal, “don't want”, and it replaces *kaavali* rather than sitting next to it. Same shape, opposite meaning: *annam kaavali* / *annam oddu*." },
                { prompt: "Say 'Okay, I want this' (Use 'This' from Scenario 2)", correct: "Sare, idhi kaavali", meaning: "Okay, I want this", hint: "Okay + this + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Accept, and say you want it.", correct: "Sare, neeru kaavali", meaning: "Okay, I want water", hint: "Okay + water + want" },
                { prompt: "Miko offers you food you don't like. Say 'Food don't want'.", correct: "Annam oddu", meaning: "I don't want food", hint: "Food + don't want" },
                { prompt: "Point to a book (from Scenario 2) and say 'Book want'.", correct: "Pusthakam kaavali", meaning: "I want the book", hint: "Book + want" },
                { prompt: "Point far away and say 'That don't want' (Use 'That' from Scenario 2).", correct: "Adhi oddu", meaning: "I don't want that", hint: "That + don't want" }
            ]
        },
        {
            scenario: "Possession",
            vocabulary: [
                { word: "Naa", meaning: "My", phonetic: "naa" },
                { word: "Naaku", meaning: "To me / I have", phonetic: "naa-ku",
                  teach: "{w} is “to me”. Telugu has no word for “have” — it says “to me there is”, so *Naaku pusthakam undi* is “I have a book”." },
                { word: "Mee", meaning: "Your", phonetic: "mee" },
                { word: "Ayana", meaning: "He (respectful) / his", phonetic: "uh-yuh-nuh", teach: "{w} is “he”, and also “his”." },
                { word: "Ame", meaning: "Her", phonetic: "uh-meh" },
                { word: "Katha", meaning: "Story", phonetic: "kuh-thuh" }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Naa peru", grammarNote: "*Ayana* is the respectful form, covering both “he” and “his” — use it for elders, teachers and strangers.", meaning: "My name", hint: "My + name" },
                { prompt: "Say 'Your book'", correct: "Mee pusthakam", meaning: "Your book", hint: "Your + book" },
                { prompt: "Say 'His story'", correct: "Ayana katha", meaning: "His story", hint: "His + story" }
            ],
            conversations: [
                { prompt: "Introduce yourself — greet Miko and tell them your name.", correct: "Namaskaram, naa peru [name]", meaning: "Hello, my name is ...", hint: "Greeting + my + name + your name",
                  grammarNote: "Telugu needs no word for “is” here — *naa peru Ravi* is literally “my name Ravi”, and that is the whole sentence." },
                { prompt: "Point at a book and say 'That is your book'.", correct: "Adhi mee pusthakam", meaning: "That is your book", hint: "That + your + book", acceptable: ["mee pusthakam"] },
                { prompt: "Say 'I have a story'.", correct: "Naaku katha undi", meaning: "I have a story", hint: "To me + story + there is", acceptable: ["naaku oka katha undi"],
                  grammarNote: "This is the “have” pattern in the wild: *naaku* (“to me”) plus *undi* (“there is”). *Naa katha* is “my story”; *naaku katha undi* is “I have a story”. The difference between *naa* and *naaku* is the difference between owning and there-being." },
                { prompt: "Point to a girl and say 'Her name'.", correct: "Ame peru", meaning: "Her name", hint: "Her + name" }
            ]
        },
        {
            scenario: "The 'Who'",
            icon: "👤",
            color: "#ede9fe",
            vocabulary: [
                { word: "Evaru", meaning: "Who", phonetic: "eh-vuh-ru", teach: "“Who” is {w}." },
                { word: "Snehithudu", meaning: "Friend", phonetic: "snay-hih-tu-du" },
                { word: "Guruvu", meaning: "Teacher", phonetic: "gu-ru-vu" },
                { word: "Thammudu", meaning: "Younger Brother", phonetic: "thum-mu-du" },
                { word: "Akka", meaning: "Elder Sister", phonetic: "uhk-kuh" }
            ],
            phrases: [
                { prompt: "Ask 'Who is he?'", correct: "Ayana evaru?", grammarNote: "*Evaru* sits at the end of the question, Telugu-style. And note it is *ayana* here, not *idhi* — *idhi* is for things, and pointing at a person with it is rude.", meaning: "Who is he?", hint: "He + who?", acceptable: ["ame evaru?"] },
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
                { word: "Okati", meaning: "One", phonetic: "o-kuh-ti", alt: ["oka"],
                  teach: "“One” is {w} on its own. Before a noun it shortens to *oka* — *oka pusthakam*, “one book” — the same way *idhi* becomes *ee*. And *oka* is the only number that keeps the noun singular: every number above one takes the plural, which is the next lesson." },
                { word: "Rendu", meaning: "Two", phonetic: "rehn-du" },
                { word: "Moodu", meaning: "Three", phonetic: "moo-du" },
                { word: "Naalugu", meaning: "Four", phonetic: "naa-lu-gu" },
                { word: "Aidhu", meaning: "Five", phonetic: "eye-du" }
            ],
            phrases: [
                { prompt: "Say 'One book'", correct: "Oka pusthakam", meaning: "One book", hint: "One + book", acceptable: ["okati pusthakam"],
                  grammarNote: "*Okati* shortened to *oka* because a noun follows it. Telugu does this to its pointing words too — *idhi* alone, *ee* before a noun. Standing on its own, counting, it stays *okati*." },
                { prompt: "Say 'Four'", correct: "Naalugu", meaning: "Four", hint: "Just the number",
                  grammarNote: "Counting, the numbers stand alone exactly as you learned them. Putting a number in front of a noun is the next step: *oka* keeps the noun singular, as in *oka pusthakam*, and every number above one makes it plural — which is what the next lesson is about." },
                { prompt: "Miko asks how many books you want. Answer 'Three'.", correct: "Moodu", meaning: "Three", hint: "Just the number" }
            ],
            conversations: [
                { prompt: "Miko asks how many friends came. Answer 'Two'.", correct: "Rendu", meaning: "Two", hint: "Just the number" },
                { prompt: "Say 'I want two'.", correct: "Rendu kaavali", meaning: "I want two", hint: "Number + want" },
                { prompt: "Tell Miko you have one sister.", correct: "Naaku oka akka undi", meaning: "I have one sister", hint: "To me + one + sister + there is",
                  acceptable: ["naaku oka akka undhi", "oka akka undi"],
                  grammarNote: "This is how Telugu says “have”: not “I have a sister” but “to me one sister there is” — *naaku* plus *undi*. Every “I have” sentence is built this way. With several people *undi* becomes *unnaru*, which is next lesson." },
                { prompt: "Count 1, 2, 3.", correct: "Okati, rendu, moodu", meaning: "1, 2, 3", hint: "Consecutive" }
            ]
        },
        {
            scenario: "Plurals",
            icon: "📚",
            color: "#fff1f2",
            vocabulary: [
                { word: "Lu", meaning: "(Plural suffix)", phonetic: "lu",
                  teach: "{w} makes a noun plural, and the noun's own ending tells you how. A vowel ending just takes it: *kurchi* to *kurchilu*. An -am ending swaps to -alu: *pusthakam* to *pusthakalu*. A -udu ending becomes -ulu: *snehithudu* to *snehithulu*." },
                { word: "Pusthakalu", meaning: "Books", phonetic: "pus-tuh-kaa-lu" },
                { word: "Chala", meaning: "Many / very", phonetic: "chaa-laa", alt: ["chaala"],
                  teach: "{w} means “many” before a noun and “very” before a describing word. *Chala pusthakalu*: “many books”." },
                { word: "Snehithulu", meaning: "Friends", phonetic: "snay-hih-tu-lu" },
                { word: "Guruvulu", meaning: "Teachers", phonetic: "gu-ru-vu-lu", teach: "*Guruvu* from lesson 6 plus that ending gives {w} — “teachers”." },
                { word: "Kurchilu", meaning: "Chairs", phonetic: "kur-chee-lu", alt: ["kurchi"],
                  teach: "One chair is *kurchi*; more than one is {w} — a vowel ending, so it simply takes -lu." }
            ],
            phrases: [
                { prompt: "Say 'Many books'", correct: "Chala pusthakalu", meaning: "Many books", hint: "Many + books",
                  grammarNote: "*Pusthakam* dropped its -am and took -alu. That is the -am pattern; the vowel-ending words in this lesson simply add -lu instead." },
                { prompt: "Say 'My friends'", correct: "Naa snehithulu", meaning: "My friends", hint: "My + friends" },
                { prompt: "Say 'Two friends'", correct: "Rendu snehithulu", meaning: "Two friends", hint: "Two + friends",
                  grammarNote: "The rule for numbers and nouns: any number above one takes the PLURAL after it — *rendu snehithulu*, *moodu pusthakalu*, *naalugu kurchilu*. Only *oka* (“one”) is followed by the singular, as in *oka pusthakam*." }
            ],
            conversations: [
                { prompt: "Tell Miko you have many friends.", correct: "Naaku chala snehithulu unnaru", meaning: "I have many friends", hint: "To me + many + friends + are",
                  acceptable: ["naaku chala snehithulu undi", "chala snehithulu unnaru"],
                  grammarNote: "Same “to me there is” shape as *naaku oka akka undi*, but *undi* has become *unnaru* because there are now several people. That is the split: *undi* for one of something, *unnaru* once you are talking about people in the plural. *Naaku oka akka undi* was singular, so it kept *undi*." },
                { prompt: "Ask 'Where are the books?'", correct: "Pusthakalu ekkada?", meaning: "Where are the books?", hint: "Books + where?",
                  acceptable: ["pusthakalu ekkada unnayi?"],
                  grammarNote: "No word for “are”. A question ending in *ekkada* needs no verb at all — *pusthakalu ekkada* is complete. You will hear *unnayi* added in careful speech, but leaving it out is normal and correct." },
                { prompt: "Say 'I don't want these chairs'.", correct: "Ee kurchilu oddu", meaning: "I don't want these chairs", hint: "These + chairs + don't want",
                  grammarNote: "*Ee* is the “this/these” that sits in front of a noun, from lesson 2. It does not change for plural — *ee kurchi* is “this chair”, *ee kurchilu* “these chairs”, and the noun does the work." },
                { prompt: "Miko asks how many books. Say 'Three books'.", correct: "Moodu pusthakalu", meaning: "Three books", hint: "Three + books" }
            ]
        },
        {
            scenario: "Basic Adjectives",
            icon: "✨",
            color: "#ecfdf5",
            vocabulary: [
                { word: "Pedda", meaning: "Big", phonetic: "pehd-duh" },
                { word: "Chinna", meaning: "Small", phonetic: "chin-nuh" },
                { word: "Manchi", meaning: "Good", phonetic: "mun-chih" },
                { word: "Chedu", meaning: "Bad", phonetic: "cheh-du" },
                { word: "Vedi", meaning: "Hot", phonetic: "vay-dih" },
                { word: "Bagundi", meaning: "It is good", phonetic: "baa-gun-dih",
                  teach: "{w} is “it is good” — *baga* (“well”) joined onto *undi* (“it is”), the same joining you met in *bagunnanu*. This is the word for a meal, a day, a film." }
            ],
            phrases: [
                { prompt: "Say 'Big house'", correct: "Pedda illu", meaning: "Big house", hint: "Big + house" },
                { prompt: "Say 'Good friend'", correct: "Manchi snehithudu", meaning: "Good friend", hint: "Good + friend" },
                { prompt: "Say 'Hot water'", correct: "Vedi neeru", meaning: "Hot water", hint: "Hot + water" }
            ],
            conversations: [
                { prompt: "Tell Miko 'This is a big book'.", correct: "Idhi pedda pusthakam", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Ask for hot water.", correct: "Vedi neeru kaavali", meaning: "I want hot water", hint: "Hot + water + want", acceptable: ["vedi neeru"] },
                { prompt: "Say 'He is a good teacher'.", correct: "Ayana manchi guruvu", meaning: "He is a good teacher", hint: "He + good + teacher" },
                { prompt: "Say 'That is bad'.", correct: "Adhi chedu", meaning: "That is bad", hint: "That + bad",
                  grammarNote: "Nothing between the two words — *adhi chedu*, and *idhi manchi* for “this is good”. Pinning a description onto a noun needs no verb at all. Keep that apart from *undi*, which says a thing exists or is somewhere: *illu akkada undi*." }
            ]
        },
        {
            scenario: "Review & Survival Dialogue",
            icon: "🍽️",
            color: "#fee2e2",
            vocabulary: [
                { word: "Bhojanam", meaning: "Meal", phonetic: "bhoh-juh-num" },
                { word: "Billu", meaning: "Bill", phonetic: "bihl-lu" },
                { word: "Ivvandi", meaning: "Give (please)", phonetic: "ihv-vun-dih", teach: "A polite “please give” is {w}." },
                { word: "Dhanyavaadaalu", meaning: "Thank you", phonetic: "dhun-yuh-vaa-daa-lu", alt: ["dhanyavadalu", "danyavadhalu"] },
                { word: "Kurchondi", meaning: "Sit (please)", phonetic: "koor-choh-ndih", teach: "A polite “please sit” is {w}." },
                { word: "Mariyu", meaning: "And", phonetic: "muh-rih-yu",
                  teach: "{w} is “and”, for joining two things: *bhojanam mariyu neeru*. Spoken Telugu often leaves it out and simply repeats the verb instead, so you will hear both." }
            ],
            phrases: [
                { prompt: "Say 'Please give the bill'", correct: "Billu ivvandi", grammarNote: "That -andi ending is what makes any Telugu command polite. You will reuse it on every verb.", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'Thank you Miko'", correct: "Dhanyavaadaalu Miko", meaning: "Thank you Miko", hint: "Thanks + Name" },
                { prompt: "Say 'I want a meal'", correct: "Bhojanam kaavali", meaning: "I want a meal", hint: "Meal + want" }
            ],
            conversations: [
                { prompt: "Order a meal and water.", correct: "Bhojanam mariyu neeru kaavali", meaning: "I want a meal and water", hint: "Meal + and + water + want",
                  acceptable: ["bhojanam kaavali, neeru kaavali", "bhojanam mariyu neeru"],
                  grammarNote: "*Mariyu* is “and”, and it joins the two things while one *kaavali* covers both. Spoken Telugu often skips it and simply repeats the verb — *bhojanam kaavali, neeru kaavali* — and both are accepted here." },
                { prompt: "Ask the waiter for the bill.", correct: "Billu ivvandi", meaning: "Please give the bill", hint: "Bill + give" },
                { prompt: "Say 'This meal is good'.", correct: "Ee bhojanam bagundi", meaning: "This meal is good", hint: "This + meal + good" },
                { prompt: "Final check: Say hello, thank you.", correct: "Namaskaram, dhanyavaadaalu", meaning: "Hello, thank you", hint: "Greet + Thanks" }
            ]
        },

        // Phase 2: The "Action" Phase (Lessons 11–20)
        {
            scenario: "Present Continuous",
            vocabulary: [
                { word: "Chestunnanu", meaning: "I am doing", phonetic: "chays-tun-naa-nu", teach: "“I am doing” is {w}." },
                { word: "Tintunnanu", meaning: "I am eating", phonetic: "tihn-tun-naa-nu",
                  teach: "{w} — “I am eating”. The *-unnanu* ending never changes; the stem in front of it does, which is why you see *ches-tunnanu* but *vel-thunnanu*. That th is a real difference in Telugu, not a spelling wobble, so take each stem as given." },
                { word: "Velthunnanu", phonetic: "vehl-tun-naa-nu", meaning: "I am going" },
                { word: "Ippudu", meaning: "Now", phonetic: "ihp-pu-du" },
                { word: "Pani", meaning: "Work", phonetic: "puh-nih", alt: ["paniki"] },
                { word: "Unnanu", meaning: "I am", phonetic: "un-naa-nu",
                  teach: "{w} is “I am” — and it is the tail of every other word in this lesson. *Chestu* plus *unnanu* gives “I am doing”. Change that ending and you change who you mean: *unnanu* is I, *unnaru* is you." }
            ],
            phrases: [
                { prompt: "Say 'I am doing work'", correct: "Nenu pani chestunnanu", grammarNote: "The -nu on the end of *chestunnanu* is the “I”. Telugu builds the subject into the verb, so one word does what English needs three for.", meaning: "I am doing work", hint: "I + work + doing" },
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
                { word: "Eeroju", meaning: "Today", phonetic: "ee-roh-ju" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "ray-pu" },
                { word: "Ninna", meaning: "Yesterday", phonetic: "nihn-nuh" },
                { word: "Appudu", meaning: "Then", phonetic: "uhp-pu-du" },
                { word: "Ganta", meaning: "Hour", phonetic: "gun-tuh" },
                { word: "Tharuvatha", meaning: "Later / after", phonetic: "thuh-ru-vaa-thuh",
                  teach: "{w} is “later”. It sits where *ippudu* (“now”) sits — before the verb, not at the end." }
            ],
            phrases: [
                { prompt: "Say 'Today I am going'", correct: "Eeroju nenu velthunnanu", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'Today I am doing work'", correct: "Eeroju nenu pani chestunnanu", meaning: "Today I am doing work", hint: "Today + I + work + am doing", acceptable: ["eeroju pani chestunnanu", "nenu eeroju pani chestunnanu"] },
                { prompt: "Say 'Tomorrow one hour'", correct: "Repu oka ganta", meaning: "Tomorrow one hour", hint: "Tomorrow + one + hour" }
            ],
            conversations: [
                { prompt: "Tell Miko you are going today.", correct: "Eeroju nenu velthunnanu", meaning: "Today I am going", hint: "Today + I + going" },
                { prompt: "Say 'I am going tomorrow'.", correct: "Repu nenu velthunnanu", meaning: "I am going tomorrow", hint: "Tomorrow + I + am going", acceptable: ["nenu repu velthunnanu", "repu velthunnanu"],
                  grammarNote: "Telugu is content to use the “am going” form for a plan, exactly as English says “I'm going tomorrow”. The time word carries the future; the verb does not have to." },
                { prompt: "Say 'I am going today'", correct: "Eeroju nenu velthunnanu", meaning: "I am going today", hint: "Today + I + am going", acceptable: ["nenu eeroju velthunnanu", "eeroju velthunnanu"],
                  grammarNote: "The time word leads. Telugu is happy to open with *eeroju* and let the verb close the sentence — time first, verb last is the normal shape." },
                { prompt: "Say 'I am eating now'.", correct: "Nenu ippudu tintunnanu", meaning: "I am eating now", hint: "I + now + am eating", acceptable: ["ippudu tintunnanu"] }
            ]
        },
        {
            scenario: "Simple Past Tense",
            vocabulary: [
                { word: "Chesanu", meaning: "I did", phonetic: "chay-saa-nu",
                  teach: "“I did” is {w}. Look at the shape: a stem, then **-anu** for the past, then nothing else — the -nu on the end is the “I”, the same -nu you met in *chestunnanu*. So the past is stem + -anu, and this lesson's five words are all built that way." },
                { word: "Vellanu", meaning: "I went", phonetic: "vehl-laa-nu",
                  teach: "{w} — “I went”. One warning worth having early: the STEM changes unpredictably. *Vellu* (“go”) gives *vellanu*, but “eat” gives *thinnanu* and “see” gives *chusanu*, and there is no rule that gets you from one to the other. Learn each verb's stem as its own word; the ENDING is what transfers." },
                { word: "Thinnanu", meaning: "I ate", phonetic: "thihn-naa-nu" },
                { word: "Chusanu", meaning: "I saw", phonetic: "choo-saa-nu" },
                { word: "Cheppanu", meaning: "I spoke / I said", phonetic: "chehp-paa-nu" }
            ],
            phrases: [
                { prompt: "Say 'I went home'", correct: "Nenu intiki vellanu", grammarNote: "Change that -nu and the subject changes with it: *chesaru* is “you did”, *chesadu* is “he did”.", meaning: "I went home", hint: "I + home + went" },
                { prompt: "Say 'I saw that'", correct: "Nenu adhi chusanu", meaning: "I saw that", hint: "I + that + saw" },
                { prompt: "Say 'I ate food'", correct: "Nenu annam thinnanu", meaning: "I ate food", hint: "I + food + ate" }
            ],
            conversations: [
                { prompt: "Miko asks about your trip. Say 'I went there'.", correct: "Nenu akkada vellanu", meaning: "I went there", hint: "I + there + went" },
                { prompt: "Say 'I did that yesterday'.", correct: "Nenu ninna adhi chesanu", meaning: "I did that yesterday", hint: "I + yesterday + that + did" },
                { prompt: "Confirm you saw Miko.", correct: "Nenu Miko chusanu", meaning: "I saw Miko", hint: "I + name + saw" },
                { prompt: "Final check: 'I went and I ate'.", correct: "Nenu vellanu mariyu thinnanu", meaning: "I went and I ate", hint: "I + went + and + ate",
                  acceptable: ["nenu vellanu, nenu thinnanu", "nenu vellanu, thinnanu"],
                  grammarNote: "*Mariyu* from lesson 10 joins the two verbs, and *nenu* need not be repeated — the -nu on each verb already says who did it." }
            ]
        },
        {
            scenario: "Simple Future Tense",
            vocabulary: [
                { word: "Chestanu", meaning: "I will do", phonetic: "chays-taa-nu",
                  teach: "“I will do” is {w}. Set it beside the past — *chesanu* “I did”, *chestanu* “I will do” — and the difference is a single **t** slipped in before the ending. That is the future: past + t. It holds for all four verbs in this lesson." },
                { word: "Velthanu", meaning: "I will go", phonetic: "vehl-thaa-nu",
                  teach: "{w} — “I will go”, from *vellanu* “I went”. Watch the trap: the future *velthanu* and the present *velthunnanu* differ only by that -unn- in the middle, and so do *chestanu*/*chestunnanu* and *tintanu*/*tintunnanu*. If you say one and mean the other you have changed the time, not made a typo." },
                { word: "Tintanu", meaning: "I will eat", phonetic: "tihn-taa-nu" },
                { word: "Chustanu", meaning: "I will see", phonetic: "choos-taa-nu" },
                { word: "Repu", meaning: "Tomorrow", phonetic: "ray-pu" }
            ],
            phrases: [
                { prompt: "Say 'I will go tomorrow'", correct: "Nenu repu velthanu", grammarNote: "Same -nu ending as the past tense, doing the same job. “You will do” is *chestaru*.", meaning: "I will go tomorrow", hint: "I + tomorrow + will go" },
                { prompt: "Say 'I will eat now'", correct: "Nenu ippudu tintanu", meaning: "I will eat now", hint: "I + now + will eat" },
                { prompt: "Say 'I will eat later'", correct: "Nenu tharuvatha tintanu", meaning: "I will eat later", hint: "I + later + will eat", acceptable: ["tharuvatha tintanu"],
                  grammarNote: "If you reached for *tintunnanu* here, that is the present — “I am eating”. The future drops the -unn-: *tintanu*. Same pair for *velthanu*/*velthunnanu* and *chestanu*/*chestunnanu*." }
            ],
            conversations: [
                { prompt: "Miko asks if you'll help. Say 'I will do it'.", correct: "Nenu chestanu", meaning: "I will do", hint: "I + will do" },
                { prompt: "Tell someone 'I will go home tomorrow'.", correct: "Nenu repu intiki velthanu", meaning: "I will go home tomorrow", hint: "I + tomorrow + home + will go" },
                { prompt: "Say 'I will see the book'.", correct: "Nenu pusthakam chustanu", meaning: "I will see the book", hint: "I + book + will see" },
                { prompt: "Final check: 'I will eat later'.", correct: "Nenu tharuvatha tintanu", meaning: "I will eat later", hint: "I + later + will eat",
                  grammarNote: "*Tharuvatha* from the time lesson slots straight in before the verb, exactly where *ippudu* went. The future is carried by the verb itself — *tintanu* — so the time word only says when, it does not do the tense." }
            ]
        },
        {
            scenario: "Asking 'Why' (Enduku)",
            vocabulary: [
                { word: "Enduku", meaning: "Why", phonetic: "ehn-du-ku", teach: "“Why” is {w}." },
                { word: "Andhuke", meaning: "That's why", phonetic: "uhn-du-kay" },
                { word: "Ishtam", meaning: "Like", phonetic: "ihsh-tum" },
                { word: "Ledu", meaning: "No/Not", phonetic: "lay-du", teach: "“No” is {w}." },
                { word: "Bhayam", meaning: "Fear", phonetic: "bhuh-yum" }
            ],
            phrases: [
                { prompt: "Ask 'Why?' about something.", correct: "Adhi enduku?", grammarNote: "*Enduku* usually opens the question in speech, though it can sit at the end too — *adhi enduku* is the everyday form. And *ledu* doubles as “is not” / “there isn’t”.", meaning: "Why is that?", hint: "That + why?", acceptable: ["enduku?"] },
                { prompt: "Say 'That's why I like it'", correct: "Andhuke naaku ishtam", meaning: "That's why I like it", hint: "That's why + to me + like",
                  grammarNote: "*Enduku* asks why; *andhuke* answers it. They are the same root, and Telugu often pairs them across two sentences — *enduku?* … *andhuke*." },
                { prompt: "Ask 'Why this?'", correct: "Idhi enduku?", meaning: "Why this?", hint: "This + why?" }
            ],
            conversations: [
                { prompt: "Miko asks why you're leaving. Answer 'That's why I am going'.", correct: "Andhuke nenu velthunnanu", meaning: "That's why I am going", hint: "That's why + I + am going", acceptable: ["andhuke velthunnanu"] },
                { prompt: "Ask someone why they want that.", correct: "Adhi enduku kaavali?", meaning: "Why want that?", hint: "That + why + want" },
                { prompt: "Say 'I don't like it'.", correct: "Naaku ishtam ledu", meaning: "I don't like it", hint: "To me + like + not",
                  grammarNote: "*Ledu* is how Telugu says no to a state: *naaku ishtam undi* is “I like it”, *naaku ishtam ledu* “I don't”. It is the negative of *undi*, so it replaces it rather than sitting alongside it." },
                { prompt: "Ask 'Why are you here?'", correct: "Meeru enduku ikkada?", meaning: "Why are you here?", hint: "You + why + here?" }
            ]
        },
        {
            scenario: "The 'How' (Ela)",
            vocabulary: [
                { word: "Ela", meaning: "How", phonetic: "eh-laa", teach: "“How” is {w}." },
                { word: "Baga", meaning: "Well", phonetic: "baa-gaa" },
                { word: "Tvaraga", meaning: "Quickly", phonetic: "tvuh-ruh-gaa" },
                { word: "Mellaga", meaning: "Slowly", phonetic: "mehl-luh-gaa" },
                { word: "Santhosham", meaning: "Happiness", phonetic: "sun-thoh-shum", alt: ["santhoshamga"],
                  teach: "{w} is “happiness”. To say you ARE happy, add -ga: *santhoshamga*, and pair it with *unnanu* — *nenu santhoshamga unnanu*." }
            ],
            phrases: [
                { prompt: "Say 'I am doing well'", correct: "Nenu baga chestunnanu", grammarNote: "*Baga* sits right before the verb, not at the front of the sentence like English puts “well” at the end.", meaning: "I am doing well", hint: "I + well + am doing", acceptable: ["baga chestunnanu"] },
                { prompt: "Say 'Go slowly'", correct: "Mellaga vellandi", meaning: "Go slowly", hint: "Slowly + go", acceptable: ["mellaga vellu"],
                  grammarNote: "The -andi ending from lesson 3 again — *vellandi* rather than *vellu* is the polite way to tell someone to do something. The adverb leads: *mellaga vellandi*, “slowly go”." },
                { prompt: "Say 'I am doing well'", correct: "Nenu baga chestunnanu", meaning: "I am doing well", hint: "I + well + doing" }
            ],
            conversations: [
                { prompt: "Ask Miko 'How is this?'", correct: "Idhi ela undi?", meaning: "How is this?", hint: "This + how + is?",
                  grammarNote: "This is the sentence you use for food, a film, a day — *idhi ela undi?* The question word sits before *undi*, and *undi* closes it, the way Telugu closes almost everything with its verb." },
                { prompt: "Say 'I am doing it quickly'.", correct: "Nenu tvaraga chestunnanu", meaning: "I am doing it quickly", hint: "I + quickly + am doing", acceptable: ["tvaraga chestunnanu"] },
                { prompt: "Say 'I am very happy'.", correct: "Nenu chala santhoshamga unnanu", meaning: "I am very happy", hint: "I + well + happy" },
                { prompt: "Ask 'How is your friend?'.", correct: "Mee snehithudu ela unnaru?", meaning: "How is your friend?", hint: "Your + friend + how?" }
            ]
        },
        {
            scenario: "Family Relations",
            vocabulary: [
                { word: "Amma", meaning: "Mother", phonetic: "um-muh" },
                { word: "Nanna", meaning: "Father", phonetic: "naan-nuh" },
                { word: "Anna", meaning: "Elder Brother", phonetic: "un-nuh" },
                { word: "Akka", meaning: "Elder Sister", phonetic: "uhk-kuh" },
                { word: "Kutumbam", meaning: "Family", phonetic: "ku-tum-bum" }
            ],
            phrases: [
                { prompt: "Say 'My mother'", correct: "Naa amma", meaning: "My mother", hint: "My + mother" },
                { prompt: "Say 'Your father'", correct: "Mee nanna", meaning: "Your father", hint: "Your + father" },
                { prompt: "Say 'This is my family'", correct: "Idhi naa kutumbam", meaning: "This is my family", hint: "This + my + family" }
            ],
            conversations: [
                { prompt: "Introduce your mother to Miko.", correct: "Idhi naa amma", meaning: "This is my mother", hint: "This + my + mother" },
                { prompt: "Ask 'Where is your home?'", correct: "Mee illu ekkada?", acceptable: ["mee inti ekkada?"], meaning: "Where is your home?", hint: "Your + house + where?" },
                { prompt: "Say 'My brother is a good friend'.", correct: "Naa anna manchi snehithudu", meaning: "My brother is a good friend", hint: "My + brother + good + friend" },
                { prompt: "Point to a photo: 'My elder sister'.", correct: "Naa akka", meaning: "My elder sister", hint: "My + sister" }
            ]
        },
        {
            scenario: "Daily Routine",
            vocabulary: [
                { word: "Niddra", meaning: "Sleep", phonetic: "nihd-ruh" },
                { word: "Snanam", meaning: "Bath", phonetic: "snaa-num" },
                { word: "Pani", meaning: "Work", phonetic: "puh-nih" },
                { word: "Melukonu", meaning: "Wake up", phonetic: "may-lu-ko-nu" },
                { word: "Vanta", meaning: "Cook", phonetic: "vun-tuh" }
            ],
            phrases: [
                { prompt: "Say 'I have work today'", correct: "Naaku eeroju pani undi", meaning: "I have work today", hint: "To me + today + work + there is", acceptable: ["eeroju naaku pani undi", "naaku pani undi"] },
                { prompt: "Say 'I want a bath'", correct: "Snanam kaavali", meaning: "I want a bath", hint: "Bath + want" },
                { prompt: "Say 'I am cooking food'", correct: "Nenu annam vanta chestunnanu", meaning: "I am cooking food", hint: "I + food + cook + doing" }
            ],
            conversations: [
                { prompt: "Tell Miko to wake up.", correct: "Melukonu", meaning: "Wake up", hint: "Just the verb" },
                { prompt: "Say 'I have work today'.", correct: "Naaku eeroju pani undi", meaning: "I have work today", hint: "Today + I + work" },
                { prompt: "Say 'Sleep later'.", correct: "Tharuvatha niddra", meaning: "Sleep later", hint: "Later + sleep" },
                { prompt: "Say 'I ate'.", correct: "Nenu thinnanu", meaning: "I ate", hint: "I + ate", acceptable: ["thinnanu"] }
            ]
        },
        {
            scenario: "Colors & Clothes",
            vocabulary: [
                { word: "Rangu", meaning: "Color", phonetic: "run-gu" },
                { word: "Batta", meaning: "Clothes", phonetic: "buht-tuh" },
                { word: "Telupu", meaning: "White", phonetic: "theh-lu-pu" },
                { word: "Nalupu", meaning: "Black", phonetic: "nuh-lu-pu" },
                { word: "Erupu", meaning: "Red", phonetic: "eh-ru-pu" }
            ],
            phrases: [
                { prompt: "Say 'Red color'", correct: "Erupu rangu", meaning: "Red color", hint: "Red + color" },
                { prompt: "Say 'White clothes'", correct: "Telupu batta", meaning: "White clothes", hint: "White + clothes" },
                { prompt: "Say 'I want black'", correct: "Nalupu kaavali", meaning: "I want black", hint: "Black + want" }
            ],
            conversations: [
                { prompt: "Miko asks your favorite color. Say 'I like red'.", correct: "Naaku erupu ishtam", meaning: "I like red", hint: "My + like + red" },
                { prompt: "Say 'I want red clothes'.", correct: "Erupu batta kaavali", meaning: "I want red clothes", hint: "Red + clothes + want",
                  grammarNote: "Telugu colour words are nouns — *erupu* is “redness” — and they sit straight in front of the thing with nothing between: *erupu batta*, “red clothes”. Same for *telupu batta* and *nalupu batta*." },
                { prompt: "Point to a white shirt: 'This is white'.", correct: "Idhi telupu", meaning: "This is white", hint: "This + white" },
                { prompt: "Ask 'What colour is that?'", correct: "Adhi em rangu?", meaning: "What colour is that?", hint: "That + what + colour?", acceptable: ["adhi emiti rangu?"],
                  grammarNote: "Telugu has no separate word for “which” here — *em*, the clipped *emiti* (“what”), does the job. And the question word sits before the noun, not at the front of the sentence." }
            ]
        },
        {
            scenario: "Review & Dialogue: Your Day",
            vocabulary: [
                { word: "Eeroju", meaning: "Today", phonetic: "ee-roh-ju", teach: "A revision lesson, so most of this is yours already — {w} is “today”, from lesson 12." },
                { word: "Baga", meaning: "Well", phonetic: "baa-gaa", teach: "{w}, “well”, from lesson 16." },
                { word: "Santhosham", meaning: "Happiness", phonetic: "sun-thoh-shum", alt: ["santhoshamga"], teach: "{w}, “happiness”, from lesson 16 — and *santhoshamga* to say you feel it." },
                { word: "Gurthundi", meaning: "Remember", phonetic: "gur-thun-dih", teach: "This one is new: {w} is “it is remembered”, and it pairs with *naaku* the way *undi* does." },
                { word: "Sare", meaning: "Okay", phonetic: "suh-ray", teach: "{w}, “okay”, from lesson 4 — one more you already have." }
            ],
            phrases: [
                { prompt: "Say 'Today was good'", correct: "Eeroju bagundi", meaning: "Today was good", hint: "Today + it is good", acceptable: ["bagundi"],
                  grammarNote: "*Bagundi* is the whole comment — *baga* joined to *undi* — so it needs no separate word for “was”. Telugu leaves the tense to context here: *eeroju bagundi* covers both “today is good” and “today was good”." },
                { prompt: "Say 'I am happy today'", correct: "Eeroju nenu santhoshamga unnanu", meaning: "Today I am happy", hint: "Today + I + happy" },
                { prompt: "Say 'I remember'", correct: "Naaku gurthundi", meaning: "I remember", hint: "To me + it is remembered",
                  grammarNote: "Another “to me” sentence, like *naaku ishtam* and *naaku pani undi*. Telugu treats remembering as something that is the case for you rather than something you do, so *naaku* carries the “I”." }
            ],
            conversations: [
                { prompt: "Miko asks about your day. Say 'It was good'.", correct: "Eeroju bagundi", meaning: "Today was good", hint: "Today + it is good", acceptable: ["bagundi"] },
                { prompt: "Tell Miko 'I am going to work now'.", correct: "Nenu ippudu paniki velthunnanu", meaning: "I am going to work now", hint: "I + now + work + going" },
                { prompt: "Say 'Okay, thank you'.", correct: "Sare, dhanyavaadaalu", meaning: "Okay, thank you", hint: "Okay + thanks" },
                { prompt: "Final check: Say hello, I am very happy.", correct: "Namaskaram, nenu chala santhoshamga unnanu", meaning: "Hello, I am very happy", hint: "Hello + I + well + happy" }
            ]
        },

        // Phase 3: The "Connector" Phase (Lessons 21–30)
        {
            scenario: "Postpositions",
            vocabulary: [
                { word: "Lo", meaning: "In", phonetic: "loh", teach: "“In” is {w}." },
                { word: "Paina", meaning: "On/Above", phonetic: "pye-nuh", teach: "“On” or “above” is {w}." },
                { word: "Kindha", meaning: "Under", phonetic: "kihn-dhuh", teach: "“Under” is {w}." },
                { word: "Tho", meaning: "With", phonetic: "thoh", teach: "“With” is {w}." },
                { word: "Daggara", meaning: "Near", phonetic: "duhg-guh-ruh", teach: "“Near” is {w}." }
            ],
            phrases: [
                { prompt: "Say 'In the house'", correct: "Inti lo", grammarNote: "All five of these follow the noun rather than coming before it — Telugu has postpositions, not prepositions. “In the house” is *inti lo*, never *lo inti*.", meaning: "In the house", hint: "House + in" },
                { prompt: "Say 'On the book'", correct: "Pusthakam paina", meaning: "On the book", hint: "Book + on" },
                { prompt: "Say 'With me' (using Tho)", correct: "Naa tho", meaning: "With me", hint: "My + with" }
            ],
            conversations: [
                { prompt: "Miko asks where you are. Say 'I am in the house'.", correct: "Nenu inti lo", meaning: "I am in the house", hint: "I + house + in", acceptable: ["nenu illu lo", "inti lo"],
                  grammarNote: "*Illu* becomes *inti* before a postposition — the same reshaping that gave you *intiki* (“to the house”) in lesson 3. *Illu lo* will be understood and is accepted here, but *inti lo* is the form to aim for." },
                { prompt: "Tell someone to sit near you.", correct: "Naa daggara kurchondi", meaning: "Sit near me", hint: "My + near + sit" },
                { prompt: "Tell Miko 'Go with him'.", correct: "Ayana tho vellandi", meaning: "Go with him", hint: "He + with + go" },
                { prompt: "Say 'Under the big chair'.", correct: "Pedda kurchi kindha", meaning: "Under the big chair", hint: "Big + chair + under", acceptable: ["pedda kurchilu kindha"],
                  grammarNote: "The postposition goes AFTER the thing — *kurchi kindha*, literally “chair under”. That is the opposite of English, and it holds for all five in this lesson." }
            ]
        },
        {
            scenario: "The 'Can' & 'Can't'",
            vocabulary: [
                { word: "Galanu", meaning: "Can", phonetic: "guh-luh-nu", teach: "{w} is the ending for “I can”." },
                { word: "Lenu", meaning: "Can't", phonetic: "lay-nu", teach: "{w} is the ending for “I can’t”." },
                { word: "Cheyagalanu", meaning: "I can do", phonetic: "chay-yuh-guh-luh-nu", teach: "“I can do” is {w}." },
                { word: "Cheyalenu", meaning: "I can't do", phonetic: "chay-yuh-lay-nu", teach: "And “I can't do” is {w} — the same verb, the other ending." },
                { word: "Matladagalanu", meaning: "I can speak", phonetic: "maat-laa-duh-guh-luh-nu" },
                { word: "Sahaayam", meaning: "Help", phonetic: "suh-haa-yum" }
            ],
            phrases: [
                { prompt: "Say 'I can do'", correct: "Nenu cheyagalanu", meaning: "I can do", hint: "I + can do", acceptable: ["cheyagalanu"],
                  grammarNote: "*-galanu* and *-lenu* are endings, not words, and the “I” is already inside them — so *cheyagalanu* alone is a complete “I can do” and *nenu* is optional. They will not let you build a NEW verb though: the stem changes shape first, so learn each pair as a pair." },
                { prompt: "Say 'I can't do'", correct: "Nenu cheyalenu", meaning: "I cannot do", hint: "I + cannot do",
                  grammarNote: "Put *cheyagalanu* and *cheyalenu* side by side and you can see the join: *cheya-* is the stem, then *-galanu* for can and *-lenu* for can't. Note the stem is *cheya*, not the *cheyu* you might expect — Telugu reshapes the verb before an ending, so learn these as pairs rather than trying to build them." },
                { prompt: "Say 'I can speak Telugu'", correct: "Nenu Telugu matladagalanu", meaning: "I can speak Telugu", hint: "I + Telugu + speak + can",
                  grammarNote: "The language calls itself *Telugu* too, so that word needs no translating. *Matladagalanu* is the *matladu*-plus-*galanu* pair — “I can speak” — and what you can speak goes in front of it." }
            ],
            conversations: [
                { prompt: "Miko asks if you can help. Say 'I can help'.", correct: "Nenu sahaayam cheyagalanu", meaning: "I can help", hint: "I + help + can do",
                  grammarNote: "Telugu has no single verb “to help”. It says “do help” — *sahaayam*, the noun, plus *cheyagalanu*, “I can do”. The same join builds *pani cheyagalanu*, “I can do work”, out of words you already have." },
                { prompt: "Tell someone 'I can't do it today'.", correct: "Eeroju nenu cheyalenu", meaning: "Today I cannot do it", hint: "Today + I + cannot do" },
                { prompt: "Say 'I can't help'.", correct: "Nenu sahaayam cheyalenu", meaning: "I can't help", hint: "I + help + cannot do" },
                { prompt: "Final check: 'I can't do this now'.", correct: "Nenu ippudu idhi cheyalenu", meaning: "I now this cannot do", hint: "I + now + this + cannot do" }
            ]
        },
        {
            scenario: "Should & Must",
            vocabulary: [
                { word: "Aali", meaning: "(Must suffix)", phonetic: "aa-lih", teach: "{w} is the ending that means “must”." },
                { word: "Cheyali", meaning: "Must do", phonetic: "chay-yaa-lih" },
                { word: "Vellali", meaning: "Must go", phonetic: "vehl-laa-lih" },
                { word: "Thinali", meaning: "Must eat", phonetic: "thih-naa-lih" },
                { word: "Matladali", meaning: "Must speak", phonetic: "maat-laa-daa-lih" }
            ],
            phrases: [
                { prompt: "Say 'I must go'", correct: "Nenu vellali", grammarNote: "Attach *-aali* to a verb stem and the verb becomes an obligation: *cheyali* is “must do”, *vellali* is “must go”.", meaning: "I must go", hint: "I + must go" },
                { prompt: "Say 'I must do work'", correct: "Nenu pani cheyali", meaning: "I must do work", hint: "I + work + must do" },
                { prompt: "Say 'I must speak Telugu'", correct: "Nenu Telugu matladali", meaning: "I must speak Telugu", hint: "I + Telugu + must speak" }
            ],
            conversations: [
                { prompt: "Miko says it's late. Say 'I must go home now'.", correct: "Nenu ippudu intiki vellali", meaning: "I must go home now", hint: "I + now + home + must go" },
                { prompt: "Tell someone 'You must eat food'.", correct: "Meeru annam thinali", meaning: "You must eat food", hint: "You + food + must eat" },
                { prompt: "Say 'I must eat now'.", correct: "Nenu ippudu thinali", meaning: "I must eat now", hint: "I + now + must eat" },
                { prompt: "Final check: 'I must do this tomorrow'.", correct: "Nenu repu idhi cheyali", meaning: "I must do this tomorrow", hint: "I + tomorrow + this + must do" }
            ]
        },
        {
            scenario: "Conjunctions",
            vocabulary: [
                { word: "Mariyu", meaning: "And", phonetic: "muh-rih-yu", teach: "“And” is {w}." },
                { word: "Kani", meaning: "But", phonetic: "kaa-nih" },
                { word: "Endukante", meaning: "Because", phonetic: "ehn-du-kun-tay" },
                { word: "Leda", meaning: "Or", phonetic: "lay-daa" },
                { word: "Sare", meaning: "Okay", phonetic: "suh-ray" }
            ],
            phrases: [
                { prompt: "Say 'I want water and food'", correct: "Neeru, annam kaavali", grammarNote: "*Mariyu* is bookish. In everyday speech Telugu usually just lists things with no “and” at all — exactly as you did here.", meaning: "Water and food want", hint: "Water + and + food + want" },
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
                { word: "Unte", meaning: "If there is", phonetic: "un-tay" },
                { word: "Velthe", meaning: "If going", phonetic: "vehl-thay" },
                { word: "Thinte", meaning: "If eating", phonetic: "tihn-tay" },
                { word: "Chesthe", meaning: "If doing", phonetic: "chays-thay" },
                { word: "Appudu", meaning: "Then", phonetic: "uhp-pu-du" }
            ],
            phrases: [
                { prompt: "Say 'If it is here'", correct: "Ikkada unte", meaning: "If it is here", hint: "Here + if there is" },
                { prompt: "Say 'If you go, then...'", correct: "Meeru velthe appudu", meaning: "If you go then", hint: "You + go(if) + then" },
                { prompt: "Say 'If I do work'", correct: "Nenu pani chesthe", meaning: "If I do work", hint: "I + work + do(if)" }
            ],
            conversations: [
                { prompt: "Tell Miko 'If you are happy, I am happy'.", correct: "Meeru santhoshamga unte, nenu santhoshamga unnanu", meaning: "If you are happy I am happy", hint: "You + happy + if + I + happy + am",
                  grammarNote: "Two halves, and only the first one carries the “if”. *Unte* closes the condition, then the second half is an ordinary sentence — *nenu santhoshamga unnanu*. Telugu never marks the “then” part; the *unte* has already done that work." },
                { prompt: "Say 'If there is water, I will eat'.", correct: "Neeru unte nenu tintanu", meaning: "If there is water I will eat", hint: "Water + if there is + I + will eat" },
                { prompt: "Say 'If you go, then I am going'.", correct: "Meeru velthe appudu nenu velthunnanu", meaning: "If you go then I am going", hint: "You + go(if) + then + I + am going", acceptable: ["meeru velthe nenu velthunnanu"] },
                { prompt: "Final check: 'If I go tomorrow...'", correct: "Repu nenu velthe", meaning: "If I go tomorrow", hint: "Tomorrow + I + go(if)", acceptable: ["repu velthe"] }
            ]
        },
        {
            scenario: "Feeling Words",
            vocabulary: [
                { word: "Santhosham", meaning: "Happiness", phonetic: "sun-thoh-shum", alt: ["santhoshamga"],
                  teach: "{w} is “happiness”. The feeling words in this lesson are NOUNS, and to say you feel one you add -ga: *santhoshamga*. Denying a feeling is the exception — there the bare noun is used." },
                { word: "Badha", meaning: "Sadness", phonetic: "baa-dhuh", alt: ["badhaga"],
                  teach: "{w} is “sadness” — and *badhaga* to say you feel it." },
                { word: "Unnara", meaning: "Are you?", phonetic: "un-naa-raa",
                  teach: "{w} turns “you are” into a question. *Unnaru* states, *unnara* asks — Telugu adds that -a to make a question rather than reordering the words." },
                { word: "Kopam", meaning: "Anger", phonetic: "koh-pum", alt: ["kopamga"],
                  teach: "{w} is “anger”, *kopamga* “angrily / angry”." },
                { word: "Alupu", meaning: "Tiredness", phonetic: "uh-lu-pu", alt: ["alupuga"],
                  teach: "{w} is “tiredness”, *alupuga* the feeling of it." },
                { word: "Bhayam", meaning: "Fear", phonetic: "bhuh-yum" }
            ],
            phrases: [
                { prompt: "Say 'I am tired'", correct: "Naaku alupuga undi", meaning: "I am tired", hint: "To me + tiredly + it is", acceptable: ["naaku alupu undi"],
                  // NOT "naaku alupu undi": dropping the -ga is exactly what this
                  // lesson teaches you not to do, and listing it as acceptable had
                  // the drill praise the error one second before the note
                  // explaining it.
                  acceptable: ["nenu alupuga unnanu"],
                  grammarNote: "Two frames, and both are accepted: *naaku* X-ga *undi* (“to me, tiredly, it is”) and *nenu* X-ga *unnanu* (“I am, happily”). Use either with any feeling here. Two exceptions: denying one drops the -ga — *naaku badha ledu* — and speaking about someone else takes *unnaru*, as in *ayana badhaga unnaru*." },
                { prompt: "Say 'Are you angry?'", correct: "Meeru kopamga unnara?", meaning: "Are you angry?", hint: "You + angry + are?" },
                { prompt: "Say 'I am not sad'", correct: "Naaku badha ledu", meaning: "I am not sad", hint: "To me + sadness + not" }
            ],
            conversations: [
                { prompt: "Miko asks how you feel. Say 'I am happy'.", correct: "Nenu santhoshamga unnanu", meaning: "I am happy", hint: "I + happy" },
                { prompt: "Tell someone you are not scared.", correct: "Naaku bhayam ledu", meaning: "I have no fear", hint: "I + fear + not" },
                { prompt: "Say 'I am very tired today'.", correct: "Eeroju naaku chala alupuga undi", meaning: "Today I am very tired", hint: "Today + to me + very + tiredly + it is",
                  acceptable: ["eeroju nenu chala alupuga unnanu", "naaku chala alupuga undi", "eeroju naaku alupuga undi"] },
                { prompt: "Point to a sad friend: 'He is sad'.", correct: "Ayana badhaga unnaru", meaning: "He is sad", hint: "He + sadly + is", acceptable: ["ayana badhaga undi", "ame badhaga unnaru"],
                  grammarNote: "*Unnaru* is doing a second job here. You learned it as “you are”, and it is also the respectful “he is / she is / they are” — the same form for anyone you would speak of politely. So the frame does not change, only the person in front of it: *meeru … unnaru*, *ayana … unnaru*." }
            ]
        },
        {
            scenario: "Advanced Numbers & Money",
            vocabulary: [
                { word: "Dabbulu", meaning: "Money", phonetic: "duhb-bu-lu" },
                { word: "Vanda", meaning: "Hundred", phonetic: "vun-duh", alt: ["veyi"],
                  teach: "“Hundred” is {w}, and “thousand” is *veyi* — both go straight in front of *rupayalu*: *vanda rupayalu*, *veyi rupayalu*." },
                { word: "Laksha", meaning: "Lakh", phonetic: "luhk-shuh" },
                { word: "Chillar", meaning: "Change", phonetic: "chihl-luh-ruh" },
                { word: "Rupayalu", meaning: "Rupees", phonetic: "roo-paa-yuh-lu", teach: "“Rupees” is {w}, and it goes AFTER the number: *vanda rupayalu*." },
                { word: "Entha", meaning: "How much", phonetic: "ehn-thuh",
                  teach: "{w} is “how much” — the word you need to ask a price. Like every Telugu question word it goes at the END: *idhi entha?*, “how much is this?”" }
            ],
            phrases: [
                { prompt: "Say 'Hundred rupees'", correct: "Vanda rupayalu", meaning: "100 rupees", hint: "100 + rupees" },
                { prompt: "Say 'I have money'", correct: "Naa daggara dabbulu", meaning: "I have money", hint: "My near + money",
                  acceptable: ["naaku dabbulu undi", "naa daggara dabbulu undi"],
                  grammarNote: "Two ways to have something, and Telugu picks by what kind of having it is. *Naaku dabbulu undi* — the lesson-5 pattern — is “money exists for me”. *Naa daggara dabbulu*, literally “near me, money”, is money you have ON you, which is what a shopkeeper means. Both are accepted here." },
                { prompt: "Say 'Give change'", correct: "Chillar ivvandi", meaning: "Give change", hint: "Change + give" }
            ],
            conversations: [
                { prompt: "Ask Miko how much something costs.", correct: "Idhi entha?", meaning: "How much is this?", hint: "This + how much?", acceptable: ["adhi entha?", "entha?"],
                  grammarNote: "*Entha* closes the question, exactly as *emiti* and *ekkada* do. And there is no verb — *idhi entha* is the whole of “how much is this?”" },
                { prompt: "Tell Miko you don't have change.", correct: "Naa daggara chillar ledu", meaning: "I don't have change", hint: "My near + change + not",
                  acceptable: ["naaku chillar ledu", "chillar ledu"],
                  grammarNote: "Both frames again, as in the last drill — *naa daggara chillar ledu* (“near me, no change”) and *naaku chillar ledu* (“to me, no change”). Denying uses *ledu* either way." },
                { prompt: "Say 'That costs one lakh'.", correct: "Adhi oka laksha", meaning: "That is 1 lakh", hint: "That + one + lakh",
                  grammarNote: "No word for “costs”. Telugu states a price as a plain equation — *adhi oka laksha*, “that, one lakh” — the same verbless shape as *idhi pusthakam*." },
                { prompt: "Ask 'Where is the money?'", correct: "Dabbulu ekkada?", meaning: "Where is the money?", hint: "Money + where?" }
            ]
        },
        {
            scenario: "Weather & Travel",
            vocabulary: [
                { word: "Enda", meaning: "Heat/Sun", phonetic: "ehn-duh" },
                { word: "Prayanam", meaning: "Trip/Travel", phonetic: "pruh-yaa-num" },
                { word: "Ticketu", meaning: "Ticket", phonetic: "tih-keht-tu" },
                { word: "Bus", meaning: "Bus", phonetic: "bus" },
                { word: "Vana", meaning: "Rain", phonetic: "vaa-nuh", teach: "“Rain” is {w}." },
                { word: "Paduthundi", meaning: "It is falling", phonetic: "puh-du-thun-dih",
                  teach: "{w} is “it is falling”. Telugu does not say “it is raining” — it says the rain is falling: *vana paduthundi*." }
            ],
            phrases: [
                { prompt: "Say 'It's very hot today'", correct: "Eeroju chala enda", meaning: "Today very hot", hint: "Today + very + heat", acceptable: ["eeroju chala enda undi"] },
                { prompt: "Say 'I want a bus ticket'", correct: "Bus ticketu kaavali", meaning: "I want a bus ticket", hint: "Bus + ticket + want" },
                { prompt: "Say 'Safe trip'", correct: "Manchi prayanam", meaning: "Good trip", hint: "Good + trip" }
            ],
            conversations: [
                { prompt: "Miko asks about the weather. Say 'It is raining'.", correct: "Vana paduthundi", meaning: "Rain is falling", hint: "Rain + is falling" },
                { prompt: "Ask someone 'Where is the bus?'", correct: "Bus ekkada?", meaning: "Where is the bus?", hint: "Bus + where?" },
                { prompt: "Say 'I am going on a trip tomorrow'.", correct: "Repu nenu prayanam velthunnanu", meaning: "Tomorrow I trip going", hint: "Tomorrow + I + trip + going" },
                { prompt: "Final check: 'It is very hot today'.", correct: "Eeroju chala enda undi", meaning: "Today there is a lot of heat", hint: "Today + very + heat + there is", acceptable: ["eeroju chala vedi undi"] }
            ]
        },
        {
            scenario: "Slang & Fillers",
            vocabulary: [
                { word: "Kada", meaning: "Right?", phonetic: "kuh-daa" },
                { word: "Chudu", meaning: "Look/See", phonetic: "choo-du" },
                { word: "Sare", meaning: "Okay", phonetic: "suh-ray" },
                { word: "Adhi", meaning: "Um (filler)", phonetic: "uh-dhih", teach: "You already know {w} as “that”. Spoken Telugu also leans on it as the filler you reach for while thinking — the “um…”. Same word, second job." },
                { word: "Avunu", meaning: "Yes", phonetic: "uh-vu-nu" }
            ],
            phrases: [
                { prompt: "Say 'It's good, right?'", correct: "Manchi, kada?", grammarNote: "*Adhi* here is the filler “um…”, the same word as “that” doing a completely different job.", meaning: "Good, right?", hint: "Good + right?" },
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
            /* A tester finished this lesson and said "I finished the course
               without knowing I had" — it ended with the same `Scenario complete`
               stamp as lesson 3, taught *aakhari* ("last") and never used it to
               say goodbye, called back none of the scenarios (not even lesson
               27's money, one lesson earlier), and spent two of its five slots on
               words that were not new. Rebuilt as an ending: a real farewell, and
               drills that reach back through the course rather than adding
               vocabulary nobody needs at the finish. */
            opener: "Last one. 🐾 Thirty lessons ago you had no Telugu at all — let's finish the way you would actually finish a conversation.",
            farewell: "Selavu! 🐾 That is the course — thirty lessons, and you closed it in Telugu. You can greet someone, say where you are and where you are from, ask what a thing is and what it costs, talk about yesterday and tomorrow, say what you can and cannot do, and say how you feel. Dhanyavaadaalu for the company.",
            vocabulary: [
                { word: "Perigaanu", meaning: "I grew up", phonetic: "peh-rih-gaa-nu" },
                { word: "Nundi", meaning: "From", phonetic: "nun-dih", teach: "“From” is {w}, and it comes AFTER the place: *Hyderabad nundi*." },
                { word: "Selavu", meaning: "Goodbye", phonetic: "seh-luh-vu",
                  teach: "{w} is how you take your leave — “goodbye”, literally “leave”. Pair it with *dhanyavaadaalu* from lesson 10 and you can close any conversation." },
                { word: "Aakhari", meaning: "Last / final", phonetic: "aa-khuh-rih" },
                { word: "Malli", meaning: "Again", phonetic: "mul-lih",
                  teach: "{w} is “again” — the word for coming back to something, which is what you want at the end of a course." }
            ],
            phrases: [
                { prompt: "Say 'I can speak Telugu'", correct: "Nenu Telugu matladagalanu", meaning: "I can speak Telugu", hint: "I + Telugu + speak + can",
                  grammarNote: "*Matladagalanu* is the *matladu* + *-galanu* pair from lesson 22. Nothing new here — that is the point of a capstone." },
                { prompt: "Say 'This is my last one'.", correct: "Idhi naa aakhari", meaning: "This is my last one", hint: "This + my + last" },
                { prompt: "Say 'I can speak Telugu again'.", correct: "Nenu malli Telugu matladagalanu", meaning: "I can speak Telugu again", hint: "I + again + Telugu + can speak", acceptable: ["malli Telugu matladagalanu"],
                  grammarNote: "*Malli* goes in front of the thing being repeated. The verb stays the *-galanu* “can” form from lesson 22, because this course never taught a plain future for *matladu* — so “can speak again” is the sentence you own." }
            ],
            conversations: [
                { prompt: "Introduce yourself properly: greet Miko, give your name, and say you can speak Telugu.", correct: "Namaskaram, naa peru [name], nenu Telugu matladagalanu", meaning: "Hello, my name is ..., I can speak Telugu", hint: "Greeting + my name + I + Telugu + speak can",
                  acceptable: ["namaskaram, naa peru [name]. nenu Telugu matladagalanu"],
                  grammarNote: "Three lessons in one sentence — the greeting from lesson 1, *naa peru* from lesson 5, *matladagalanu* from lesson 22. This is what thirty lessons buys you." },
                { prompt: "Miko asks what your book cost. Say 'One hundred rupees'.", correct: "Vanda rupayalu", meaning: "One hundred rupees", hint: "Hundred + rupees",
                  grammarNote: "Lesson 27's money, still yours. The number leads and *rupayalu* follows, with no verb between them." },
                { prompt: "Tell someone 'I am from Hyderabad and I grew up there'.", correct: "Nenu Hyderabad nundi, nenu akkada perigaanu", meaning: "I am from Hyderabad and I grew up there", hint: "I + [city] + from, I + there + grew up",
                  acceptable: ["nenu [place] nundi, nenu akkada perigaanu"] },
                { prompt: "Thank Miko, then say goodbye.", correct: "Dhanyavaadaalu, selavu", meaning: "Thank you, goodbye", hint: "Thank you + goodbye", acceptable: ["selavu, dhanyavaadaalu", "dhanyavaadaalu selavu", "miko, dhanyavaadaalu, selavu"],
                  grammarNote: "The last thing the course teaches you is how to leave politely, which is the phrase you will actually need first." }
            ]
        }
    ],
    Kannada: [
        // Phase 1: The Foundation (Lessons 1–10)
        {
            scenario: "Pronouns & Greetings",
            icon: "👋",
            color: "#e0f2fe",
            vocabulary: [
                { word: "Namaskara", meaning: "Hello", phonetic: "nuh-mus-kaa-ruh", alt: ["namaste", "namaskaara"] },
                { word: "Naanu", meaning: "I", phonetic: "naa-nu" },
                { word: "Neevu", meaning: "You (polite)", phonetic: "nee-vu",
                  teach: "“You” is {w} — use it when you are speaking politely or respectfully, and also whenever you are speaking to more than one person." },
                { word: "Chennagiddeeni", meaning: "I am fine", phonetic: "chehn-naa-gih-dee-nih", alt: ["chennagiddini", "chennagidini", "chennagiddene", "chennagidddeeni"],
                  teach: "“I am fine” is {w} — a whole sentence in one word. Kannada builds the subject into the verb ending, so nothing here says “I” or “am” separately. Learn it as one piece for now; the ending is picked apart in a moment." },
                { word: "Hege", meaning: "How", phonetic: "hay-geh" },
                { word: "Iddeera", meaning: "Are you (polite)", phonetic: "ihd-dee-raa", alt: ["iddira", "iddiri"],
                  teach: "{w} is “are you” — the polite form, the one that goes with *Neevu*. Put it straight after *hege* and Kannada runs the two together: *hege iddeera* becomes **hegiddeera?**, “how are you?”. Joined or separate, both are correct." }
            ],
            phrases: [
                { prompt: "Say 'Hello, I am fine'", correct: "Namaskara, naanu chennagiddeeni", meaning: "Hello, I am fine", hint: "Hello + I + I-am-fine",
                  acceptable: ["namaskara, chennagiddeeni", "namaskara chennagiddeeni", "namaskara, naanu chennagiddini", "namaskara, chennagiddini", "namaskara chennagiddini"],
                  grammarNote: "*Chennagiddeeni* is a whole sentence on its own. Its -eeni ending already tells you the subject is “I”, so *naanu* can be left out and nothing separate is needed for “am”. The matching “you” ending is the -eera in *iddeera*: change the ending, change who is being talked about." },
                { prompt: "Ask 'How are you?' (formal)", correct: "Neevu hegiddeera?", meaning: "How are you?", hint: "You + how-are-you",
                  acceptable: ["neevu hege iddeera?", "hege iddeera?", "hegiddeera?", "neevu hegiddira?", "hegiddira?", "neevu hege iddira?", "hege iddira?", "neevu hegiddeera"],
                  grammarNote: "That is *hege* and *iddeera* fused, as promised — and *hege iddeera* said separately is equally correct. *Neevu* is optional here for the same reason *naanu* was: the -eera ending already says “you”." },
                { prompt: "Say 'I'm fine — you?'", correct: "Naanu chennagiddeeni, neevu?", meaning: "I am fine, and you?", hint: "I-am-fine + you?",
                  acceptable: ["chennagiddeeni, neevu?", "naanu chennagiddeeni, matte neevu?", "chennagiddeeni matte neevu?", "chennagiddini, neevu?", "naanu chennagiddini, neevu?"],
                  grammarNote: "No word for “and” is needed here — Kannada just sets the two halves side by side. *Matte* (“and”) exists, but a bare *neevu?* is how this is really said. It is also the one place the pronoun earns its keep: setting yourself beside the other person is the contrast *naanu* marks." }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskara, naanu chennagiddeeni", meaning: "Hello, I am fine", hint: "Hello + I-am-fine",
                  acceptable: ["namaskara, chennagiddeeni", "namaskara chennagiddeeni", "namaskara, naanu chennagiddini", "namaskara, chennagiddini"] },
                { prompt: "Ask Miko how they are doing — start with their name.", correct: "Miko, neevu hegiddeera?", meaning: "Miko, how are you?", hint: "Name + you + how-are-you",
                  acceptable: ["miko, neevu hege iddeera?", "miko, neevu hegiddira?", "miko, hegiddeera?", "miko hegiddeera", "miko, hege iddeera?", "neevu hegiddeera?", "hegiddeera?", "hege iddeera?", "neevu hege iddeera?", "miko, hegiddira?"],
                  grammarNote: "Leading with the name is as normal in Kannada as in English. Everything after it is the question you already built." },
                { prompt: "Someone asks 'Neevu hegiddeera?'. Tell them you are fine.", correct: "Naanu chennagiddeeni", meaning: "I am fine", hint: "Direct answer",
                  acceptable: ["chennagiddeeni", "chennagiddini", "naanu chennagiddini"],
                  grammarNote: "Answering, most people drop *naanu* altogether — *chennagiddeeni* already says who is fine." },
                { prompt: "Final check: say hello, say you are fine, and ask how they are.", correct: "Namaskara, naanu chennagiddeeni, neevu hegiddeera?", meaning: "Hello, I am fine, how are you?", hint: "Hello + I-am-fine + how-are-you",
                  acceptable: ["namaskara, naanu chennagiddeeni, neevu hege iddeera?", "namaskara naanu chennagiddeeni neevu hegiddeera?", "namaskara, chennagiddeeni, neevu hegiddeera?", "namaskara, chennagiddeeni, hegiddeera?", "namaskara, chennagiddeeni, hege iddeera?", "namaskara, naanu chennagiddeeni, hegiddeera?", "namaskara, naanu chennagiddeeni, neevu hegiddira?", "namaskara, chennagiddini, hegiddeera?", "namaskara, naanu chennagiddini, neevu hegiddeera?", "namaskara chennagiddeeni hegiddeera"],
                  grammarNote: "That is the whole exchange in one breath. Dropping both pronouns — *Namaskara, chennagiddeeni, hegiddeera?* — is what you will hear most often." }
            ],
            farewell: "That is a real conversation — you can open and answer one now."
        },
        {
            scenario: "The 'What' & 'This/That'",
            icon: "❓",
            color: "#fef3c7",
            vocabulary: [
                { word: "Idu", meaning: "This", phonetic: "ih-du", teach: "“This” is {w} — something near you." },
                { word: "Adu", meaning: "That", phonetic: "uh-du",
                  teach: "“That” is {w} — something further off. Look at the pair: *idu* and {w} differ by one vowel at the very front. That front vowel is how Kannada marks near against far, and you will meet the same i-/a- pair on other words. Get it wrong and you have said the opposite, so it is worth hearing twice." },
                { word: "Yenu", meaning: "What", phonetic: "ay-nu", alt: ["enu"], teach: "“What” is {w}." },
                { word: "Pustaka", meaning: "Book", phonetic: "pus-tuh-kuh" },
                { word: "Hesaru", meaning: "Name", phonetic: "heh-suh-ru" }
            ],
            phrases: [
                { prompt: "Ask 'What is this?'", correct: "Idu yenu?", meaning: "What is this?", hint: "This + what?",
                  acceptable: ["idu enu?", "idu yenu", "idu enu"],
                  grammarNote: "Two orderings in one short sentence: the pointing word comes FIRST, before the thing — and the question word *yenu* goes LAST, where English puts “what” at the front. Every Kannada question word behaves this way." },
                { prompt: "Say 'This is a book'", correct: "Idu pustaka", meaning: "This is a book", hint: "This + book",
                  grammarNote: "There is no word for “is” in this sentence, and none is missing — Kannada simply sets the two nouns side by side and the “is” is understood. You will meet *ide* (“it is”) next lesson, for saying where something is; here it would be wrong." },
                { prompt: "Ask 'What is that?'", correct: "Adu yenu?", meaning: "What is that?", hint: "That + what?",
                  acceptable: ["adu enu?", "adu yenu", "adu enu"] }
            ],
            conversations: [
                { prompt: "Someone holds out a book right in front of you. Ask what it is.", correct: "Idu yenu?", meaning: "What is this?", hint: "This + what?",
                  acceptable: ["idu enu?", "idu yenu", "idu enu"] },
                { prompt: "Point to a distant object and ask 'What is that?'", correct: "Adu yenu?", meaning: "What is that?", hint: "That + what?",
                  acceptable: ["adu enu?", "adu yenu", "adu enu"],
                  grammarNote: "Swap that first vowel back and you are pointing at your own hand again: *idu yenu?* is “what is this?”. One letter, opposite meaning." },
                { prompt: "Tell Miko 'This is a book'.", correct: "Idu pustaka", meaning: "This is a book", hint: "This + book" },
                { prompt: "Ask 'What is the name?'", correct: "Hesaru yenu?", meaning: "What is the name?", hint: "Name + what?",
                  acceptable: ["hesaru enu?", "hesaru yenu", "hesaru enu"],
                  grammarNote: "To make that “what is YOUR name?” you need the word for “your”, *nimma*, which is lesson 5 — *Nimma hesaru yenu?*. The shape of the sentence is already right; only the possessive is missing." }
            ],
            farewell: "You can point at something and ask what it is — the first question anyone needs."
        },
        {
            scenario: "The 'Where' & 'Going'",
            icon: "🧭",
            color: "#dcfce7",
            vocabulary: [
                { word: "Yelli", meaning: "Where", phonetic: "yehl-lih", teach: "“Where” is {w}." },
                { word: "Mane", meaning: "House / home", phonetic: "muh-neh", alt: ["manege"],
                  teach: "“House” is {w}. Going TO it, the word takes -ge: *manege*. Kannada puts that ending ON the noun, never a separate word in front of it." },
                { word: "Illi", meaning: "Here", phonetic: "ihl-lih",
                  teach: "“Here” is {w}. It is the same near/far pair you met in *idu* / *adu*, on a new word: {w} is near." },
                { word: "Alli", meaning: "There", phonetic: "uhl-lih",
                  teach: "“There” is {w} — the far one. *Illi* and {w} differ only in that first vowel, exactly like *idu* and *adu*, so slow down on it." },
                { word: "Ide", meaning: "It is / there is", phonetic: "ih-deh",
                  teach: "{w} is “it is” or “there is” — for a THING. About a person you use the *iddeeni* / *iddeera* forms hiding inside *chennagiddeeni*, and with a plain place Kannada usually drops the verb altogether: *naanu illi*, “I am here”. So *mane alli ide* keeps its verb and *naanu illi* does not." },
                { word: "Hoguttene", meaning: "I go / I am going", phonetic: "hoh-gut-tay-neh", alt: ["hogtini", "hoguttini"],
                  teach: "“I am going” is {w}. Its -ttene ending already tells you the subject is “I” — the same person-marking you met in *chennagiddeeni*, now on a verb of motion." },
                { word: "Hogu", meaning: "Go", phonetic: "hoh-gu", alt: ["hogi"],
                  teach: "“Go!” is {w} — telling someone to go." }
            
            ],
            phrases: [
                { prompt: "Ask 'Where is the house?'", correct: "Mane yelli?", meaning: "Where is the house?", hint: "House + where?",
                  acceptable: ["mane yelli", "mane elli?", "mane elli"],
                  grammarNote: "*Yelli* comes AFTER the thing you are asking about, where English puts “where” at the front — the same move *yenu* made last lesson. Add the verb and *yelli* still sits in front of it: *Mane yelli ide?* is equally correct, and is the fuller way to say it." },
                { prompt: "Say 'Go there'", correct: "Alli hogu", meaning: "Go there", hint: "There + go",
                  acceptable: ["alli hogi"] },
                { prompt: "Say 'I am going home'", correct: "Naanu manege hoguttene", meaning: "I am going home", hint: "I + to-the-house + I-am-going",
                  acceptable: ["manege hoguttene", "naanu manege hogtini", "manege hogtini", "naanu manege hoguttini"],
                  grammarNote: "Both new pieces at once. *Mane* took -ge to mean “to the house” — that ending goes on the noun, and it is how Kannada marks any destination. And *hoguttene* is a real verb with a tense, not a command: its ending already tells you the subject is “I”, so *naanu* is optional here too." }
            ],
            conversations: [
                { prompt: "Ask Miko where the home is.", correct: "Mane yelli?", meaning: "Where is the home?", hint: "House + where?",
                  acceptable: ["mane yelli", "mane elli?", "mane elli"] },
                { prompt: "Say 'The house is there'.", correct: "Mane alli ide", meaning: "The house is there", hint: "House + there + it-is",
                  acceptable: ["mane alli ide.", "alli mane ide"],
                  grammarNote: "*Ide* is doing real work here: without it *mane alli* is just “house there”, and it is *ide* that makes it a statement that something IS somewhere. Note the contrast with lesson 2 — *idu pustaka* needs no “is” at all, because that sentence says what a thing IS, not where it is." },
                { prompt: "Someone asks 'Neevu yelli?'. Tell them you are here.", correct: "Naanu illi", meaning: "I am here", hint: "I + here",
                  acceptable: ["illi", "naanu illi iddeeni", "naanu illi ide"],
                  grammarNote: "No verb here, and none is missing. *Ide* is for things — *mane alli ide* — while a person in a place usually needs none at all: *naanu illi*. The fuller *naanu illi iddeeni* is also right, and that *iddeeni* is the one inside *chennagiddeeni*." },
                { prompt: "Final Check: say 'I am going there'.", correct: "Naanu alli hoguttene", meaning: "I am going there", hint: "I + there + I-am-going",
                  acceptable: ["alli hoguttene", "naanu alli hogtini", "alli hogtini", "naanu alli hoguttini"] }
            ],
            farewell: "You can now say where something is, and where you are going."
        },
        {
            scenario: "Desires & Negation",
            icon: "🍽️",
            color: "#fee2e2",
            vocabulary: [
                { word: "Beku", meaning: "Want", phonetic: "bay-ku" },
                { word: "Beda", meaning: "Don't want", phonetic: "bay-duh" },
                { word: "Oota", meaning: "Food", phonetic: "oo-tuh" },
                { word: "Neeru", meaning: "Water", phonetic: "nee-ru" },
                { word: "Haudu", meaning: "Yes", phonetic: "how-du" },
                { word: "Illa", meaning: "No / not", phonetic: "ihl-luh",
                  teach: "“No” is {w}. Mind the last letter — *illi* with an i is “here”, from last lesson." },
                { word: "Dhanyavada", meaning: "Thank you", phonetic: "dhun-yuh-vaa-duh", alt: ["dhanyavadagalu", "danyavada"] }
            ],
            phrases: [
                { prompt: "Say 'I want water'", correct: "Neeru beku", meaning: "I want water", hint: "Water + want",
                  grammarNote: "Two words and no “I”. *Beku* means “is wanted”, so the thing wanted comes first and the person is left to context — *neeru beku* is how you ask for water in a shop, in a home, anywhere. If you ever need to be explicit it is *nanage neeru beku*, literally “to me water is wanted”." },
                { prompt: "Say 'I don't want food'", correct: "Oota beda", meaning: "I don't want food", hint: "Food + don't want",
                  grammarNote: "*Beda* is not the word “no” — it is a whole refusal, “don't want”, and it REPLACES *beku* rather than sitting next to it. Same shape, opposite meaning: *oota beku* / *oota beda*." },
                { prompt: "Say 'I want this'", correct: "Idu beku", meaning: "I want this", hint: "This + want" }
            ],
            conversations: [
                { prompt: "Miko offers you water. Say yes, you want water.", correct: "Haudu, neeru beku", meaning: "Yes, I want water", hint: "Yes + water + want",
                  acceptable: ["haudu neeru beku"] },
                { prompt: "Someone offers you food you don't like. Refuse it.", correct: "Illa, oota beda", meaning: "No, I don't want food", hint: "No + food + don't want",
                  acceptable: ["illa oota beda", "oota beda"],
                  grammarNote: "*Illa* is the general-purpose “no”: it also does “not” and “isn't”, and when it negates a sentence it goes at the end. Here it stands alone at the front, as a plain refusal, and *beda* carries the rest." },
                { prompt: "Say 'I don't want that'.", correct: "Adu beda", meaning: "I don't want that", hint: "That + don't want" },
                { prompt: "Miko brings you the water. Thank them.", correct: "Dhanyavada", meaning: "Thank you", hint: "One word",
                  acceptable: ["dhanyavada miko", "dhanyavadagalu"] }
            ],
            farewell: "Asking for what you want, refusing what you don't, and saying thank you — that is most of a shop visit."
        },
        {
            scenario: "Possession",
            icon: "🫱",
            color: "#ede9fe",
            vocabulary: [
                { word: "Nanna", meaning: "My", phonetic: "nun-nuh" },
                { word: "Nimma", meaning: "Your", phonetic: "nihm-muh" },
                { word: "Aatana", meaning: "His", phonetic: "aa-tuh-nuh" },
                { word: "Avara", meaning: "His / her (respectful)", phonetic: "uh-vuh-ruh",
                  teach: "{w} is the respectful “his” OR “her” — the polite form draws no gender distinction, so one word covers both. Reach for it about anyone you would speak of respectfully; *aatana* is the plain “his”." },
                { word: "Kathe", meaning: "Story", phonetic: "kuh-theh", alt: ["kathey", "kate"] }
            ],
            phrases: [
                { prompt: "Say 'My name'", correct: "Nanna hesaru", meaning: "My name", hint: "My + name",
                  grammarNote: "The possessive comes first and the noun after it does not change at all — *nanna hesaru*, *nanna pustaka*, *nanna mane*. English does the same, so this one is free." },
                { prompt: "Say 'your book' — the book belonging to the person you are speaking to.", correct: "Nimma pustaka", meaning: "Your book", hint: "Your + book",
                  grammarNote: "*Nanna* and *nimma* are near-twins on the page and opposites in meaning — mine and yours. Read the middle of the word, not the shape of it." },
                { prompt: "Say 'His story'", correct: "Aatana kathe", meaning: "His story", hint: "His + story",
                  acceptable: ["aatana kathey", "avara kathe"] }
            ],
            conversations: [
                { prompt: "Introduce yourself: 'Hello, my name is Ravi'.", correct: "Namaskara, nanna hesaru Ravi", meaning: "Hello, my name is Ravi", hint: "Hello + my + name + Ravi",
                  acceptable: ["namaskara nanna hesaru ravi", "nanna hesaru ravi"] },
                { prompt: "Point at a book across the room and tell Miko: \u201cthat is your book\u201d (it belongs to them).", correct: "Adu nimma pustaka", meaning: "That is your book", hint: "That + your + book",
                  grammarNote: "Watch which “your” an English prompt means. *Nimma* is the person you are TALKING TO — here, Miko. When a prompt says “your teacher” meaning the one who teaches YOU, the word is *nanna*, “my”." },
                { prompt: "Point at your teacher and say 'her name', respectfully.", correct: "Avara hesaru", meaning: "Her name (respectful)", hint: "Respectful her + name",
                  acceptable: ["avara hesaru?"],
                  grammarNote: "*Avara* is the one word for a respectful “his” AND “her” — no gender to choose. It is what you reach for about anyone senior to you; *aatana* is the plain “his” you used a moment ago." },
                { prompt: "Ask someone what their name is.", correct: "Nimma hesaru yenu?", meaning: "What is your name?", hint: "Your + name + what?",
                  acceptable: ["nimma hesaru enu?", "nimma hesaru yenu", "nimma hesaru enu"],
                  grammarNote: "This is last lesson's *Hesaru yenu?* with the possessive slotted in front. Nothing else moved — that is how most Kannada sentences grow." }
            ],
            farewell: "You can introduce yourself and ask a name back. That is a whole first meeting."
        },
        {
            scenario: "The 'Who'",
            icon: "🧑",
            color: "#ede9fe",
            vocabulary: [
                { word: "Yaaru", meaning: "Who", phonetic: "yaa-ru", teach: "“Who” is {w}." },
                { word: "Ivaru", meaning: "This person / he / she (polite)", phonetic: "ih-vuh-ru",
                  teach: "{w} is “this person” — and also how you say “he” or “she” about someone standing in front of you. Kannada has no separate polite word for either, so {w} is what a prompt saying “he” or “she” wants. Same near/far vowel: *avaru* is “that person”." },
                { word: "Snehita", meaning: "Friend", phonetic: "snay-hih-tuh" },
                { word: "Shikshaka", meaning: "Teacher", phonetic: "shihk-shuh-kuh", alt: ["shikshak"] },
                { word: "Akka", meaning: "Elder sister", phonetic: "uk-kuh" },
                { word: "Avaru", meaning: "That person (polite)", phonetic: "uh-vuh-ru",
                  teach: "{w} is “that person” — someone further off. Same near/far vowel you have met twice already: *idu*/*adu*, *illi*/*alli*, and now *ivaru*/{w}." }
            ],
            phrases: [
                { prompt: "Ask 'Who is this?'", correct: "Ivaru yaaru?", meaning: "Who is this?", hint: "This person + who?",
                  acceptable: ["ivaru yaaru"],
                  grammarNote: "*Yaaru* goes at the end, like every question word you have met. And *ivaru* is the polite way to refer to someone who is present — safer, and warmer, than pointing." },
                { prompt: "Say 'This is my friend'", correct: "Ivaru nanna snehita", meaning: "This is my friend", hint: "This person + my + friend" },
                { prompt: "Say 'This is my elder sister'", correct: "Ivaru nanna akka", meaning: "This is my elder sister", hint: "This person + my + elder sister",
                  grammarNote: "English would start this with “she”. Kannada starts it with *ivaru*, the same word you used for “this person” — there is no separate “she” to reach for here." }
            ],
            conversations: [
                { prompt: "A friend brings someone over to your table. Ask who they are.", correct: "Ivaru yaaru?", meaning: "Who is this?", hint: "This person + who?",
                  acceptable: ["ivaru yaaru"] },
                { prompt: "Tell Miko that this person teaches you — this is my teacher.", correct: "Ivaru nanna shikshaka", meaning: "This is my teacher", hint: "This person + my + teacher" },
                { prompt: "Introduce your own friend to Miko — \u201cthis is my friend\u201d.", correct: "Ivaru nanna snehita", meaning: "This is my friend", hint: "This person + my + friend" },
                { prompt: "Someone is standing across the room. Ask who that person is.", correct: "Avaru yaaru?", meaning: "Who is that person?", hint: "That person + who?",
                  acceptable: ["avaru yaaru"],
                  grammarNote: "Third time that vowel has done the same job: *ivaru yaaru?* asks about the person beside you, *avaru yaaru?* about the one across the room. Once you have noticed the i-/a- pattern you can predict it rather than memorise it." }
            ],
            farewell: "You can now introduce people and ask who someone is."
        },
        {
            scenario: "Basic Numbers",
            icon: "🔢",
            color: "#e0f2fe",
            vocabulary: [
                { word: "Ondu", meaning: "One", phonetic: "on-du" },
                { word: "Eradu", meaning: "Two", phonetic: "eh-ruh-du" },
                { word: "Mooru", meaning: "Three", phonetic: "moo-ru" },
                { word: "Naalku", meaning: "Four", phonetic: "naal-ku", alt: ["naalku", "nalku"] },
                { word: "Aidu", meaning: "Five", phonetic: "eye-du" }
            ],
            phrases: [
                { prompt: "Count from one to three", correct: "Ondu, eradu, mooru", meaning: "One, two, three", hint: "Count up",
                  acceptable: ["ondu eradu mooru"] },
                { prompt: "Say 'two books'", correct: "Eradu pustaka", meaning: "Two books", hint: "Two + book",
                  grammarNote: "The noun does NOT change after a number — *eradu pustaka*, not a plural form. The number has already told you there is more than one, so Kannada leaves the noun alone. You meet the plural ending next lesson, for saying “books” when there is no number in front of it." },
                { prompt: "Say 'five houses'", correct: "Aidu mane", meaning: "Five houses", hint: "Five + house" }
            ],
            conversations: [
                { prompt: "Miko asks how many books you have. Say three.", correct: "Mooru pustaka", meaning: "Three books", hint: "Three + book" },
                { prompt: "Count all the way from one to five.", correct: "Ondu, eradu, mooru, naalku, aidu", meaning: "One to five", hint: "Full count",
                  acceptable: ["ondu eradu mooru naalku aidu"] },
                { prompt: "Say 'four friends'", correct: "Naalku snehita", meaning: "Four friends", hint: "Four + friend" },
                { prompt: "Ask for two waters.", correct: "Eradu neeru beku", meaning: "Two waters, please", hint: "Two + water + want",
                  grammarNote: "First time three lessons have met in one sentence: a number, a noun, and *beku* from lesson 4. That recombining is the whole point — the vocabulary is small, the sentences you can build from it are not." }
            ],
            farewell: "One to five, and you can already order two waters with them."
        },
        {
            scenario: "Plurals",
            icon: "📚",
            color: "#dcfce7",
            vocabulary: [
                { word: "Pustakagalu", meaning: "Books", phonetic: "pus-tuh-kuh-guh-lu",
                  teach: "“Books” is {w} — *pustaka* with **-galu** stuck on the end. That -galu is how Kannada makes a THING plural. It is an ending, never a word on its own, so you will always meet it attached to something." },
                { word: "Manegalu", meaning: "Houses", phonetic: "muh-neh-guh-lu" },
                { word: "Hoovu", meaning: "Flower", phonetic: "hoo-vu" },
                { word: "Hoovugalu", meaning: "Flowers", phonetic: "hoo-vu-guh-lu",
                  teach: "“Flowers” is {w} — *hoovu* with the same -galu on the end. Once you have the singular, the plural builds itself." },
                { word: "Snehitaru", meaning: "Friends", phonetic: "snay-hih-tuh-ru",
                  teach: "“Friends” is {w} — and NOT *snehitagalu*. People take -aru; things take -galu. That split runs through the whole language, so it is worth learning here on one word rather than being surprised by it later." }
            ],
            phrases: [
                { prompt: "Say 'books'", correct: "Pustakagalu", meaning: "Books", hint: "Book + plural ending",
                  grammarNote: "*Pustaka* became *pustakagalu*. That -galu on the end is the whole change; nothing else moves." },
                { prompt: "Say 'my friends'", correct: "Nanna snehitaru", meaning: "My friends", hint: "My + friends",
                  grammarNote: "Not *snehitagalu*. Friends are people, and people take -aru. If you are ever unsure which ending a word takes, ask whether it is a person: person → -aru, thing → -galu." },
                { prompt: "Say 'flowers'", correct: "Hoovugalu", meaning: "Flowers", hint: "Flower + plural ending" }
            ],
            conversations: [
                { prompt: "Tell Miko about your friends — say 'my friends'.", correct: "Nanna snehitaru", meaning: "My friends", hint: "My + friends" },
                { prompt: "Say 'the houses'", correct: "Manegalu", meaning: "Houses", hint: "House + plural ending" },
                { prompt: "Tell Miko you want flowers.", correct: "Hoovugalu beku", meaning: "I want flowers", hint: "Flowers + want" },
                { prompt: "Say 'my books'", correct: "Nanna pustakagalu", meaning: "My books", hint: "My + books",
                  grammarNote: "Worth holding these two side by side: *eradu pustaka* (“two books”, no ending, because the number said it) and *nanna pustakagalu* (“my books”, ending needed, because nothing else did)." }
            ],
            farewell: "One ending for things, another for people — and you know which is which."
        },
        {
            scenario: "Basic Adjectives",
            icon: "🎨",
            color: "#fef3c7",
            vocabulary: [
                { word: "Dodda", meaning: "Big", phonetic: "dod-duh" },
                { word: "Chikka", meaning: "Small", phonetic: "chihk-kuh" },
                { word: "Olleya", meaning: "Good (before a noun)", phonetic: "ol-leh-yuh",
                  teach: "“Good” is {w}, and it goes in FRONT of a noun: *olleya oota*, “good food”. It cannot be left dangling at the end of a sentence in this shape — ending one needs a different form, which you meet in a moment." },
                { word: "Ketta", meaning: "Bad (before a noun)", phonetic: "keht-tuh",
                  teach: "“Bad” is {w}, and like *olleya* it goes in FRONT of a noun: *ketta oota*. For “the food IS bad”, Kannada usually says it is not good: *chennagilla* — *chennagi* plus the *illa* (“not”) from lesson 4." },
                { word: "Bisi", meaning: "Hot", phonetic: "bih-sih" },
                { word: "Chennagide", meaning: "It is good", phonetic: "chehn-naa-gih-deh",
                  teach: "To say something IS good, you need {w} — and you already know both halves: the *chennagi* from *chennagiddeeni* (“I am well”) and the *ide* from lesson 3 (“it is”). *Olleya* cannot do this job." }
            ],
            phrases: [
                { prompt: "Say 'a big house'", correct: "Dodda mane", meaning: "A big house", hint: "Big + house",
                  grammarNote: "The adjective sits in front of the noun and never changes shape — no agreement, no endings. That part is easier than English." },
                { prompt: "Say 'good food'", correct: "Olleya oota", meaning: "Good food", hint: "Good + food" },
                { prompt: "Say 'hot water'", correct: "Bisi neeru", meaning: "Hot water", hint: "Hot + water" }
            ],
            conversations: [
                { prompt: "Tell Miko the food is good.", correct: "Oota chennagide", meaning: "The food is good", hint: "Food + it-is-good",
                  acceptable: ["oota chennagide.", "oota chennaagide"],
                  grammarNote: "Here is the split this lesson is really about. In front of a noun, use *olleya* — *olleya oota*, “good food”. To say the food IS good, that word will not do it; you need *chennagide*. English uses “good” for both jobs and Kannada does not, which is the single thing to take away from this lesson." },
                { prompt: "Say 'this is a big book'", correct: "Idu dodda pustaka", meaning: "This is a big book", hint: "This + big + book" },
                { prompt: "Miko offers you food that has gone off. Refuse it — 'I don't want bad food'.", correct: "Ketta oota beda", meaning: "I don't want bad food", hint: "Bad + food + don't want",
                  grammarNote: "*Ketta* in front of the noun, *beda* from lesson 4 on the end. To say the food IS bad rather than refuse it, you would say *oota chennagilla* — “not good” — built from the *illa* you already have." },
                { prompt: "Say 'my small house'", correct: "Nanna chikka mane", meaning: "My small house", hint: "My + small + house",
                  grammarNote: "Possessive, then adjective, then noun — they stack in that order and none of them changes. To END a sentence the adjective takes -du and stands alone: *nanna mane chikkadu*, “my house is small”, and likewise *doddadu*, *olleyadu*." }
            ],
            farewell: "You can describe things now, and say when one of them is good."
        },
        {
            scenario: "Review & Survival Dialogue",
            icon: "🧾",
            color: "#fce7f3",
            vocabulary: [
                { word: "Kshamisi", meaning: "Sorry / excuse me", phonetic: "kshuh-mih-sih", alt: ["kshamisu"] },
                { word: "Lekka", meaning: "Bill", phonetic: "lehk-kuh" },
                { word: "Kodi", meaning: "Give (please)", phonetic: "ko-dih", alt: ["kodu"],
                  teach: "A polite “please give” is {w}. It sits alongside *beku*, not instead of it: *beku* says what you want, {w} asks the person to hand it over. In a shop either one works — *neeru beku* and *neeru kodi* will both get you water." },
                { word: "Eshtu", meaning: "How much", phonetic: "ehsh-tu", alt: ["estu"] },
                { word: "Sari", meaning: "Okay / right", phonetic: "suh-rih" }
            ],
            phrases: [
                { prompt: "Say 'excuse me'", correct: "Kshamisi", meaning: "Excuse me", hint: "One word" },
                { prompt: "Ask for the bill", correct: "Lekka kodi", meaning: "Give the bill", hint: "Bill + give",
                  grammarNote: "That -i on the end of *kodi* is the politeness ending on a command. Kannada softens an order by changing the last letter rather than adding a word for “please” — so the blunt *hogu* (“go!”) from lesson 3 becomes the polite *hogi*, exactly as *kodu* becomes *kodi*." },
                { prompt: "Say 'okay, thank you'", correct: "Sari, dhanyavada", meaning: "Okay, thank you", hint: "Okay + thanks",
                  acceptable: ["sari dhanyavada", "sari, dhanyavadagalu"] }
            ],
            conversations: [
                { prompt: "You have finished eating. Ask for the bill.", correct: "Lekka kodi", meaning: "Give me the bill", hint: "Bill + give" },
                { prompt: "Ask how much the book is.", correct: "Pustaka eshtu?", meaning: "How much is the book?", hint: "Book + how much?",
                  acceptable: ["pustaka estu?", "pustaka eshtu", "pustaka estu"],
                  grammarNote: "*Pustaka* is from lesson 2 and *eshtu* is from today, and the question word still goes last — exactly where *yenu* and *yelli* went. Three lessons, one sentence pattern." },
                { prompt: "Greet the shopkeeper, then ask for two waters.", correct: "Namaskara, eradu neeru kodi", meaning: "Hello, two waters please", hint: "Hello + two + water + give",
                  acceptable: ["namaskara, eradu neeru beku", "namaskara eradu neeru kodi", "namaskara eradu neeru beku"],
                  grammarNote: "Lesson 1, lesson 7, lesson 4 and today in one line. Either ending works: *kodi* asks them to hand it over, *beku* says what you want." },
                { prompt: "Excuse yourself, then ask where the house is.", correct: "Kshamisi, mane yelli?", meaning: "Excuse me, where is the house?", hint: "Excuse me + house + where?",
                  acceptable: ["kshamisi mane yelli?", "kshamisi, mane elli?", "kshamisi mane yelli"],
                  grammarNote: "Opening with *kshamisi* is how you stop a stranger politely, and everything after it is lesson 3, unchanged. That is the whole trick of this course: a small stock of words, snapped together." }
            ],
            farewell: "Ten lessons in, you can greet, ask, want, refuse, count, point, describe and thank. That is a real toolkit."
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
                { prompt: "Say 'I'm fine — you?'", correct: "Main theek hoon, aap?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaste, main theek hoon", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, aap kaise hain?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Mu bhala, apana?", meaning: "I am fine, and you?", hint: "I + fine + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskara, mu bhala", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, apana kemiti achhanti?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Naan nalla irukken, neenga?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Vanakkam, naan nalla irukken", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, neenga eppadi irukkeenga?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Ami bhalo achi, apni?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskar, ami bhalo achi", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, apni kemon achen?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Ask Miko how they are doing.", correct: "Miko, tumhi kasa ahat?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Njan sugam-ayi irikkunnu, ningalo?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Namaskkaram, njan sugam-ayi irikkunnu", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, sugamano?", meaning: "Miko, are you fine?", hint: "Name + fine?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Main theek hoon, aap?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Assalamu Alaikum, main theek hoon", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, aap kaise hain?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
                { prompt: "Say 'I'm fine — you?'", correct: "Main theek haan, tusi?", meaning: "I am fine, and you?", hint: "I + fine + am + you?" }
            ],
            conversations: [
                { prompt: "A friend greets you. Say hello and that you are fine.", correct: "Sat Sri Akaal, main theek haan", meaning: "Hello, I am fine", hint: "Basic greeting" },
                { prompt: "Ask Miko how they are doing.", correct: "Miko, tusi ki haal ho?", meaning: "Miko, how are you?", hint: "Name + you + how + are?" },
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
