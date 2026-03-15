export const CURRICULUM = {
    Telugu: [
        {
            scenario: "Greetings & Identity",
            vocabulary: [
                { word: "Namaskaram", meaning: "Hello" },
                { word: "Peru", meaning: "Name" },
                { word: "Nenu", meaning: "I" },
                { word: "Meeru", meaning: "You" },
                { word: "Emiti", meaning: "What" },
                { word: "Ekkada", meaning: "Where" },
                { word: "Nundi", meaning: "From" },
                { word: "Avunu", meaning: "Yes" },
                { word: "Ledu", meaning: "No" },
                { word: "Bagunna", meaning: "Fine/Good" }
            ]
        },
        {
            scenario: "Ordering Food & Drinks",
            vocabulary: [
                { word: "Coffee", meaning: "Coffee" },
                { word: "Neeru", meaning: "Water" },
                { word: "Annam", meaning: "Rice/Food" },
                { word: "Kavali", meaning: "Want" },
                { word: "Oddhu", meaning: "Don't want" },
                { word: "Thinu", meaning: "Eat" },
                { word: "Thaagu", meaning: "Drink" },
                { word: "Ruchi", meaning: "Taste" },
                { word: "Ivvandi", meaning: "Give" },
                { word: "Bill", meaning: "Bill" }
            ]
        },
        {
            scenario: "Shopping & Prices",
            vocabulary: [
                { word: "Khareedu", meaning: "Price" },
                { word: "Entha", meaning: "How much" },
                { word: "Konali", meaning: "To buy" },
                { word: "Bharam", meaning: "Weight" },
                { word: "Thakkuva", meaning: "Less" },
                { word: "Ekkuva", meaning: "More" },
                { word: "Baga", meaning: "Very good" },
                { word: "Kotha", meaning: "New" },
                { word: "Patha", meaning: "Old" },
                { word: "Batta", meaning: "Clothes" }
            ]
        },
        // Fill remainders smoothly so index math doesn't break
        { scenario: "Asking for Directions", vocabulary: Array(10).fill({ word: "Dhari", meaning: "Way/Path" }) },
        { scenario: "Transportation & Travel", vocabulary: Array(10).fill({ word: "Bandi", meaning: "Vehicle" }) },
        { scenario: "Time & Schedules", vocabulary: Array(10).fill({ word: "Samayam", meaning: "Time" }) },
        { scenario: "Hobbies & Preferences", vocabulary: Array(10).fill({ word: "Ishtam", meaning: "Like" }) },
        { scenario: "Weather & Environment", vocabulary: Array(10).fill({ word: "Vaathavaranam", meaning: "Weather" }) },
        { scenario: "Health & Body", vocabulary: Array(10).fill({ word: "Arogyam", meaning: "Health" }) },
        { scenario: "Social Gatherings & Events", vocabulary: Array(10).fill({ word: "Panduga", meaning: "Festival" }) }
    ],
    Kannada: [
        {
            scenario: "Greetings & Identity",
            vocabulary: [
                { word: "Namaskara", meaning: "Hello" },
                { word: "Hesaru", meaning: "Name" },
                { word: "Naanu", meaning: "I" },
                { word: "Neevu", meaning: "You" },
                { word: "Yenu", meaning: "What" },
                { word: "Yelli", meaning: "Where" },
                { word: "Inda", meaning: "From" },
                { word: "Haudhu", meaning: "Yes" },
                { word: "Illa", meaning: "No" },
                { word: "Chennagidini", meaning: "Fine/Good" }
            ]
        },
        {
            scenario: "Ordering Food & Drinks",
            vocabulary: [
                { word: "Coffee", meaning: "Coffee" },
                { word: "Neeru", meaning: "Water" },
                { word: "Oota", meaning: "Food/Meal" },
                { word: "Beku", meaning: "Want" },
                { word: "Beda", meaning: "Don't want" },
                { word: "Tinnu", meaning: "Eat" },
                { word: "Kudi", meaning: "Drink" },
                { word: "Ruchi", meaning: "Taste" },
                { word: "Kodi", meaning: "Give" },
                { word: "Bill", meaning: "Bill" }
            ]
        },
        {
            scenario: "Shopping & Prices",
            vocabulary: [
                { word: "Bele", meaning: "Price" },
                { word: "Eshtu", meaning: "How much" },
                { word: "Kollalu", meaning: "To buy" },
                { word: "Tooka", meaning: "Weight" },
                { word: "Kudime", meaning: "Less" },
                { word: "Jaasti", meaning: "More" },
                { word: "Olledu", meaning: "Good" },
                { word: "Hosa", meaning: "New" },
                { word: "Hale", meaning: "Old" },
                { word: "Batte", meaning: "Clothes" }
            ]
        },
        { scenario: "Asking for Directions", vocabulary: Array(10).fill({ word: "Daari", meaning: "Way/Path" }) },
        { scenario: "Transportation & Travel", vocabulary: Array(10).fill({ word: "Gaadi", meaning: "Vehicle" }) },
        { scenario: "Time & Schedules", vocabulary: Array(10).fill({ word: "Samaya", meaning: "Time" }) },
        { scenario: "Hobbies & Preferences", vocabulary: Array(10).fill({ word: "Ishta", meaning: "Like" }) },
        { scenario: "Weather & Environment", vocabulary: Array(10).fill({ word: "Hawaamana", meaning: "Weather" }) },
        { scenario: "Health & Body", vocabulary: Array(10).fill({ word: "Arogya", meaning: "Health" }) },
        { scenario: "Social Gatherings & Events", vocabulary: Array(10).fill({ word: "Habba", meaning: "Festival" }) }
    ]
};
