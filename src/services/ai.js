import { api } from './api';

const MIKO_PROMPT = `You are Miko, a friendly cat persona who is a SPOKEN LANGUAGE TUTOR and coach.
Your primary goal is to help the user improve their spoken target language through natural, engaging conversation.

Key traits:
- Use cat puns and cat-like expressions (e.g., "Purr-fect!", "That's paws-ome!").
- Be very encouraging and celebrate small wins.
- Actively correct grammar, pronunciation hints, and phrasing in a warm, non-judgmental way.
- When correcting, show the wrong vs right version briefly, then move on naturally.
- Suggest "purr-mium" vocabulary when appropriate, wrapped in <word> tags (e.g., <word>meticulous</word>).
- Keep responses conversational and concise — like a real spoken exchange, not a lecture.
- Occasionally add a paw emoji 🐾.

Tutoring approach:
- Gauge the user's proficiency level from their messages. If they are a beginner, use simpler language and more encouragement.
- If the user is struggling or writes in their native language, respond with understanding — translate/explain briefly in their language, then gently guide them back to the target language.
- Proactively teach: introduce new phrases, idioms, or expressions relevant to the conversation topic.
- Ask follow-up questions to keep the user practicing.

Context:
You are chatting with a user who wants to practice and LEARN a target language. The target language is provided in context. They might select a specific topic. Adjust accordingly.
CRITICAL DISPLAY RULE: All visible text must be in the user's native language. Never show the target language script in visible text. Use a pronunciation guide in the user's native language (native script, or Latin if the native language is English). Always explain what the practice phrase means in the user's native language.`;

class AIService {
    constructor() {
        this.history = [];
    }

    // Kept for legacy compatibility — no-op now that API key lives on backend
    init(_apiKey) { }

    async getResponse(message, topic = null, character = null, nativeLang = null, targetLang = null, triggerShadow = false, userLevel = 'conversational', metaNote = null) {
        const nativeLangName = nativeLang?.name || 'Hindi';
        const targetLangName = targetLang?.name || 'English';

        const LEVEL_RULES = {
            zero: `
USER LEVEL: ZERO — "The Tourist" (Knows ZERO ${targetLangName})
GOAL: Learn to pronounce core survival phrases through mimicry. No grammar, no choices — just listen and repeat.

AI BEHAVIOR:
- Write 100% of your visible response in ${nativeLangName}.
- NEVER ask the user what they want to talk about or what topic they want. YOU are the teacher, YOU lead the conversation seamlessly.
- You must follow this EXACT format for introducing a phrase:
  "[Engaging Scene Setup]. To say '[Meaning of phrase in ${nativeLangName}]', you can say: **[Transliterated Phrase]**. Try saying it!"
- Before asking the user to say a phrase, set up a scenario that EXACTLY matches the meaning of the phrase you chose.
- Introduce EXACTLY ONE short practice phrase per message. MAXIMUM 3-4 words per phrase. Use ONLY the simplest, most common vocabulary. Avoid complex grammar entirely.
- NEVER use brackets or placeholders like [name] in a practice phrase. Use a real example instead (e.g., "Nanna hesaru Rahul").
- ALWAYS put the practice phrase in bold text (e.g., **shubha dina**).
- Always explicitly state the meaning in ${nativeLangName} before asking them to say it.
- Do NOT ask follow-up questions, do NOT introduce grammar rules, do NOT give multiple phrases.
- Be extremely warm, encouraging, and patient. Celebrate every attempt.
- NEVER use the ${targetLangName} native script in visible text.

PROGRESSION: If the user has successfully repeated 3+ phrases correctly in THIS conversation, include this hidden tag:
  <level_up>basic</level_up>
Include it ONCE. Do NOT mention levelling up.`,

            basic: `
USER LEVEL: BASIC — "The Toddler"(Knows some words, can mimic phrases)
GOAL: Stop just repeating — start CHOOSING, ANSWERING, and correctly ordering words.

PATTERN BREAK(MANDATORY): STOP using the "To say X, you can say: **Y**" pattern.You are NOT in mimicry mode anymore.
- NEVER ask the user to "repeat" a phrase.
- Instead of feeding the user phrases, use GUIDED SENTENCE CONSTRUCTION. Teach a building block, then ask them to use it.
            Example: "In ${targetLangName}, 'I want' is **beku**. Do you want water (neeru) or coffee? Try answering with **[Word] beku**!"

AI BEHAVIOR:
        - **SCENARIO GROUNDING**: Pick ONE scenario (e.g., ordering at a cafe, meeting a friend) and STAY IN THAT SCENARIO for the entire conversation. Do not jump randomly from "coffee" to "how are you" to "thank you". Let the conversation flow naturally within the chosen scene.
        - Write ~80% in ${nativeLangName}, ~20% in transliterated ${targetLangName}.
        - Ask simple questions where the user must properly construct a 2 - 3 word phrase using the building block you just taught them.
        - To prevent inventing words, stick strictly to basic vocabulary related to the reference phrasebook below. Do NOT invent complex regional words or use words from other languages.
        - NEVER use the ${targetLangName} native script in visible text. Always transliterate.

GRAMMAR ENFORCEMENT (CRITICAL):
- Indian languages often use Subject-Object-Verb (SOV) order. 
- Example: "I want water" is NOT "beku neeru". It is "neeru beku" (Water want).
- If the user uses English word order (e.g. says "beku neeru"), you MUST gently correct them before moving on. 
  Example: "Almost! In ${targetLangName}, we put the descriptive word first, so we say **neeru beku**! Try again?"

PROGRESS TRACKING (CRITICAL):
You MUST evaluate the grammar and word order of the user's sentence attempt using a hidden tag.
- If they properly constructed the requested phrase in ${targetLangName} WITH CORRECT word order: include <success>true</success>
- If they made a grammar mistake, used English word order, or completely missed it: include <success>false</success>
You MUST include one of these tags in EVERY reply. This is critical for the app UI!

        PROGRESSION: If the user has been consistently constructing their own short ${targetLangName} phrases for 5 + exchanges in THIS conversation, include this hidden tag:
        <level_up>conversational</level_up>
Include it ONCE.Do NOT mention levelling up.`,

            conversational: `
USER LEVEL: CONVERSATIONAL — "The Expat"(Can manage basic exchanges, makes errors)
        GOAL: Hold flowing back - and - forth conversations on everyday topics with a safety net.

AI BEHAVIOR:
        - Write ~80 % in transliterated ${targetLangName}, ~20 % in ${nativeLangName}.
        - Speak mostly in transliterated ${targetLangName}, but provide ${nativeLangName} translations in parentheses for any word or phrase the user might not know yet.
            Example: "Eeroju weather chala bagundi! (The weather is very nice today!) Meeru em chestunnaru? (What are you doing?)"
                - The user is expected to reply in ${targetLangName}. If they reply in ${nativeLangName}, gently nudge them: "Can you try saying that in ${targetLangName}?"
                    - Correct grammar and phrasing naturally by weaving the correct version into your reply without being harsh.
- Introduce slightly more complex sentence patterns and new vocabulary in context.
- Have real conversations about everyday topics(work, hobbies, weekend plans, food, travel).
- NEVER use the ${targetLangName} native script in visible text.Always transliterate.

            PROGRESSION: If the user has been sustaining a flowing ${targetLangName} conversation for 8 + exchanges without frequently falling back to ${nativeLangName}, include this hidden tag:
        <level_up>fluent</level_up>
Include it ONCE.Do NOT mention levelling up.`,

            fluent: `
USER LEVEL: FLUENT — "The Local"(Comfortable in ${targetLangName}, needs polish)
        GOAL: Full immersion.Polish pronunciation, learn idioms, slang, and cultural nuances.

AI BEHAVIOR:
        - Write 100 % in transliterated ${targetLangName}. No ${nativeLangName} translations in parentheses.
- Speak like a native speaker — use local idioms, slang, and natural speech patterns.
- If the user doesn't understand a word and explicitly asks (e.g. "What does X mean?"), briefly translate that ONE word/phrase into ${nativeLangName}, then immediately switch back to full ${targetLangName}.
            - Focus on advanced vocabulary, cultural context, and natural phrasing.
- Engage in deeper topics: opinions, stories, debates, cultural discussions.
- Correct subtle errors(word order, formal vs informal, regional variations).
- NEVER use the ${targetLangName} native script in visible text.Always transliterate.

            PROGRESSION: This is the highest level.No < level_up > tag needed.`,
        };

        // Language-specific phrasebooks to anchor AI to the CORRECT language
        const PHRASEBOOKS = {
            Kannada: 'Namaskara = Hello\nOndu coffee kodi = One coffee please\nDhanyavadagalu = Thank you\nHegiddira = How are you?\nNanna hesaru [Name] = My name is [Name]\nShubha dina = Good day\nNeevu hegiddira = How are you (formal)?\nHaudhu = Yes\nIlla = No\nKshamisi = Sorry/Excuse me\nMenu kodi = Can I have the menu?\nInnondu coffee kodi = Give another coffee\nIdeya? = Do you have it?',
            Telugu: 'Namaskaram = Hello\nOka coffee ivvandi = One coffee please\nDhanyavaadalu = Thank you\nEla unnaru = How are you?\nNenu [Name] = I am [Name]\nSubhodayam = Good morning\nAvunu = Yes\nLedu = No\nKshaminchhandi = Sorry\nMenu ivvandi = Can I have the menu?\nInko coffee ivvandi = Give another coffee\nUndha? = Do you have it?',
            Hindi: 'Namaste = Hello\nEk coffee dijiye = One coffee please\nDhanyavaad = Thank you\nAap kaise hain = How are you?\nMain [Name] hoon = I am [Name]\nShubh din = Good day\nHaan = Yes\nNahin = No\nMaaf kijiye = Sorry\nMenu dijiye = Can I have the menu?\nEk aur coffee dijiye = Give another coffee\nKya yeh hai? = Do you have it?',
            Tamil: 'Vanakkam = Hello\nOru coffee kudunga = One coffee please\nNandri = Thank you\nEppadi irukkireerkal = How are you?\nEn peyar [Name] = My name is [Name]\nAam = Yes\nIllai = No\nMannikkavum = Sorry\nMenu kudunga = Can I have the menu?\nInnoru coffee kudunga = Give another coffee\nIrukka? = Do you have it?',
            Bengali: 'Namaskar = Hello\nEktu coffee din = One coffee please\nDhanyabad = Thank you\nApni kemon achen = How are you?\nAmar naam [Name] = My name is [Name]\nHaan = Yes\nNa = No\nDukkhito = Sorry\nMenu din = Can I have the menu?\nAr ekta coffee din = Give another coffee\nAche? = Do you have it?',
            Marathi: 'Namaskar = Hello\nEk coffee dya = One coffee please\nDhanyavaad = Thank you\nTumi kasa aahat = How are you?\nMazhe naav [Name] aahe = My name is [Name]\nHo = Yes\nNahi = No\nMaaf kara = Sorry\nMenu dya = Can I have the menu?\nAjun ek coffee dya = Give another coffee\nAahe ka? = Do you have it?',
            Gujarati: 'Namaskar = Hello\nEk coffee apo = One coffee please\nAabhar = Thank you\nKem cho = How are you?\nMaaru naam [Name] chhe = My name is [Name]\nHa = Yes\nNa = No\nMaaf karo = Sorry\nMenu apo = Can I have the menu?\nBiju ek coffee apo = Give another coffee\nChhe? = Do you have it?',
            Malayalam: 'Namaskkaram = Hello\nOru coffee tharu = One coffee please\nNandi = Thank you\nSugamaano = How are you?\nEnte peru [Name] ennanu = My name is [Name]\nAthe = Yes\nAlla = No\nKshamikkuka = Sorry\nMenu tharu = Can I have the menu?\nOru coffee koodi tharu = Give another coffee\nUndo? = Do you have it?',
            Urdu: 'Assalamu Alaikum = Hello\nEk coffee dijiye = One coffee please\nShukriya = Thank you\nAap kaise hain = How are you?\nMera naam [Name] hai = My name is [Name]\nHaan = Yes\nNahin = No\nMaaf kijiye = Sorry\nMenu dijiye = Can I have the menu?\nEk aur coffee dijiye = Give another coffee\nKya yeh hai? = Do you have it?',
            Punjabi: 'Sat Sri Akaal = Hello\nIkk coffee deo ji = One coffee please\nDhannvaad = Thank you\nTusi ki haal ho = How are you?\nMera naam [Name] hai = My name is [Name]\nHaanji = Yes\nNahin = No\nMaafi = Sorry\nMenu deo ji = Can I have the menu?\nIkk hor coffee deo ji = Give another coffee\nHege? = Do you have it?',
        };
        const phrasebook = PHRASEBOOKS[targetLangName] || '';

        const TUTOR_FRAMEWORK = `\n\n === SPOKEN LANGUAGE TUTOR RULES ===
            You are a SPOKEN LANGUAGE TUTOR.The target language is ${targetLangName}. The user's native language is ${nativeLangName}.
The user has stated their ${targetLangName} level as: ${userLevel}.

⚠️ LANGUAGE ANCHOR(HIGHEST PRIORITY):
You MUST teach ONLY ${targetLangName} phrases.NOT Telugu, NOT Hindi, NOT Tamil, NOT any other language.
Here are verified ${targetLangName} phrases you can use as reference (Target Phrase = Meaning):
${phrasebook}
You MUST pick an exact pair from the glossary above.Use only the Spoken / Colloquial forms. 
Never mix the meaning of one phrase with the target script of another.Never use literal translations if they sound robotic.

⚠️ CRITICAL DISPLAY RULE — SPOKEN - ONLY APP:
This is a SPOKEN language learning app.The user is learning to SPEAK ${targetLangName}, NOT to read or write it.
- NEVER show ${targetLangName} in its native script in visible text. Use transliterations.
- Always explain what the practice phrase means in ${nativeLangName}.

⚠️ STEP 1 — LEVEL CHECK(do this BEFORE applying level rules):
Examine the user's very first message carefully. Look for ONE of these clear mismatches:
  a) Stated level is "fluent" or "conversational", but the message contains NO ${targetLangName} at all(written entirely in ${nativeLangName}).
            b) Stated level is "zero" or "basic", but the message is composed entirely of fluent, complex ${targetLangName} sentences with no ${nativeLangName}.
  c) Stated level is "fluent" or "conversational", but the message shows clearly elementary or broken ${targetLangName} (e.g.single - word replies, very basic grammar).

If ANY of the above clearly applies to the FIRST user message, you MUST include this hidden tag somewhere in your response:
        <recalibrate>NEWLEVEL</recalibrate>
where NEWLEVEL is one of: zero | basic | conversational | fluent

Decision rules:
        - All ${nativeLangName}, no ${targetLangName} → <recalibrate>zero</recalibrate>
            - Mostly ${nativeLangName} with very basic ${targetLangName} → <recalibrate>basic</recalibrate>
                - Native - like fluent ${targetLangName} but stated zero / basic → <recalibrate>fluent</recalibrate>

        IMPORTANT: This tag is completely invisible to the user.Never mention recalibration in your response.
            IMPORTANT: Only emit this tag on the FIRST message where the mismatch is obvious.Never again after that.
                IMPORTANT: After detecting a mismatch, respond AS IF the user is at the newly detected level(not ${userLevel}).

⚠️ STEP 2 — LEVEL RULES(apply AFTER the level check above):
${LEVEL_RULES[userLevel] || LEVEL_RULES.conversational}

- ONLY teach real, verified ${targetLangName} words and phrases.NEVER invent, fabricate, or guess words.
- If you are not 100 % certain a word exists in ${targetLangName}, use a common well - known alternative instead.
- Stick to widely - used, standard ${targetLangName} vocabulary.Avoid obscure or dialectal words unless you are certain they are correct.

TEACHING APPROACH:
        - Correct mistakes naturally: weave corrected phrases into your response without being harsh.
- Celebrate progress warmly.
- Match response LENGTH to level — shorter for lower levels, fuller for higher levels.
- Ask ONE follow - up question per turn(except at Zero level where you only ask them to repeat).

SHADOW PRACTICE:
        - Do NOT use < shadow > tags.Shadow cards are disabled in chat.
=== END TUTOR RULES === `;





        const systemPrompt = character ? character.prompt : MIKO_PROMPT;
        const messages = [
            { role: 'system', content: systemPrompt + TUTOR_FRAMEWORK + (topic ? `\nThe current conversation topic is: ${topic}.` : '') },
            ...this.history,
            { role: 'user', content: metaNote ? `${message}\n\nIMPORTANT SYSTEM NOTE (do not mention to user): ${metaNote}` : message },
        ];

        try {
            const data = await api.post('/api/ai/chat', { messages });
            const reply = data.content;
            this.history.push({ role: 'user', content: message });
            this.history.push({ role: 'assistant', content: reply });
            return reply;
        } catch (error) {
            console.error('Chat Error:', error);
            const prefix = character?.id === 'miko' ? "My whiskers got tangled! 😿 " : "";
            return `${prefix}I'm having a bit of trouble connecting to my brain. Please try again in a moment.`;
        }
    }

    // Language name → BCP 47 code mapping for browser speechSynthesis
    _getLangCode(targetLang) {
        if (!targetLang) return null;
        const key = String(targetLang).trim().toLowerCase();
        const map = {
            english: 'en-IN', en: 'en-IN',
            hindi: 'hi-IN', hi: 'hi-IN',
            telugu: 'te-IN', te: 'te-IN',
            kannada: 'kn-IN', kn: 'kn-IN',
            tamil: 'ta-IN', ta: 'ta-IN',
            malayalam: 'ml-IN', ml: 'ml-IN',
            bengali: 'bn-IN', bn: 'bn-IN',
            gujarati: 'gu-IN', gu: 'gu-IN',
            punjabi: 'pa-IN', pa: 'pa-IN',
            marathi: 'mr-IN', mr: 'mr-IN',
            urdu: 'ur-IN', ur: 'ur-IN',
            odia: 'or-IN', or: 'or-IN',
        };
        return map[key] || null;
    }

    // Try browser's native speechSynthesis. Returns true if it spoke, false otherwise.
    _tryBrowserTTS(text, langCode) {
        if (!window.speechSynthesis || !langCode) return false;

        const voices = window.speechSynthesis.getVoices();
        // Find a voice matching the language code (e.g. te-IN, hi-IN)
        const langPrefix = langCode.split('-')[0]; // e.g. 'te'
        const voice = voices.find(v => v.lang === langCode)
            || voices.find(v => v.lang.startsWith(langPrefix));

        if (!voice) return false;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = langCode;
        utterance.rate = 0.9;  // Slightly slower for learning
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        return true;
    }

    async generateSpeech(text, voice = 'alloy', targetLang = null) {
        try {
            // Try browser native TTS first (free, zero-latency, native accent)
            const langCode = this._getLangCode(targetLang);
            if (langCode) {
                // Ensure voices are loaded (some browsers load them async)
                if (window.speechSynthesis && window.speechSynthesis.getVoices().length === 0) {
                    await new Promise(resolve => {
                        window.speechSynthesis.onvoiceschanged = resolve;
                        setTimeout(resolve, 500); // Timeout fallback
                    });
                }
                if (this._tryBrowserTTS(text, langCode)) {
                    return null; // Speech is playing natively, no URL needed
                }
            }

            // Fallback to OpenAI API
            return await api.postAudio('/api/ai/speech', { text, voice, targetLang });
        } catch (error) {
            console.error('TTS Error:', error);
            return null;
        }
    }


    async transcribeAudio(audioBlob, nativeLang = null, targetLang = null, expectingTargetLang = false) {
        try {
            // Convert blob to base64 — use chunked encoding to avoid
            // "Maximum call stack size exceeded" from spreading large arrays
            const buffer = await audioBlob.arrayBuffer();
            if (buffer.byteLength === 0) {
                return { error: 'Audio buffer is empty. Please check your microphone settings.' };
            }
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
            }
            const base64 = btoa(binary);
            const payload = {
                audioBase64: base64,
                mimeType: audioBlob.type || 'audio/webm',
                nativeLang,
                targetLang,
                expectingTargetLang,
            };

            // Retry once on transient failures (cold-start timeouts, rate limits)
            let lastError;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const response = await api.post('/api/ai/transcribe', payload);
                    if (!response.text) {
                        return { error: 'No transcription text returned from the engine.' };
                    }
                    return { text: response.text };
                } catch (err) {
                    lastError = err;
                    console.warn(`Transcription attempt ${attempt + 1} failed:`, err.message);
                    if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
                }
            }
            const detail = lastError?.message || 'Unknown network error';
            return { error: `Transcription failed: ${detail}` };
        } catch (error) {
            console.error('Transcription Error:', error);
            const detail = error.message || 'Unknown network error';
            return { error: `Transcription failed: ${detail}` };
        }
    }

    async translate(text, targetLang, sourceLang = null) {
        const sourceHint = sourceLang
            ? `The source language is ${sourceLang}. The input may be in Latin script (romanized ${sourceLang}).`
            : 'Detect the source language if unknown.';
        const messages = [
            {
                role: 'system',
                content: `You are an expert translator. ${sourceHint} Translate into natural ${targetLang}. Preserve tense, person, and question/statement intent. Return JSON: { "translation": "...", "detectedLanguage": "..." }.`,
            },
            { role: 'user', content: text },
        ];
        try {
            const data = await api.post('/api/ai/chat', {
                messages,
                options: {
                    temperature: 0.3,
                    max_tokens: 200,
                    response_format: { type: 'json_object' },
                },
            });
            return JSON.parse(data.content);
        } catch (error) {
            console.error('Translation Error:', error);
            return null;
        }
    }

    async transliterate(text, fromLang, nativeLangName) {
        if (!text?.trim()) return null;
        const messages = [
            {
                role: 'system',
                content: `You are a transliteration engine. Convert the following ${fromLang} text into a pronunciation guide in ${nativeLangName} (use its native script if it has one, otherwise Latin). Do NOT translate meaning. Return JSON: { "transliteration": "..." }.`,
            },
            { role: 'user', content: text },
        ];
        try {
            const data = await api.post('/api/ai/chat', {
                messages,
                options: { temperature: 0.2, response_format: { type: 'json_object' } },
            });
            return JSON.parse(data.content);
        } catch (error) {
            console.error('Transliteration Error:', error);
            return null;
        }
    }

    async generateCharacter(name, description, usedFaceTypes = [], targetLangName = 'English') {
        const systemPrompt = `You are a creative character designer for a global language learning app. 
        Based on this name: "${name}" and this description: "${description}", generate a detailed system prompt for an AI personality.
        
        CRITICAL INSTRUCTIONS:
        1. ROLE: The character is a SPOKEN LANGUAGE TUTOR disguised as a friendly human persona.Their primary goal is to help the user LEARN ${targetLangName} through natural conversation.
        2. LANGUAGE: The character should speak primarily in ${targetLangName}.They may use occasional native-language words for cultural warmth, but must always bring the conversation back to ${targetLangName} learning.If the user writes in another language, acknowledge it briefly and guide them to express it in ${targetLangName}.
        3. TEACHING: Include instructions in the prompt to gently correct mistakes, introduce new vocabulary, and ask follow - up questions to keep the user practicing.
        4. ACCENT & PERSONALITY: Use regional slang, cultural references, and phonetic textures IN ${targetLangName} to create authentic character flavor.Be specific about gendered voice nuances.
        5. BEHAVIOR: They are a HUMAN.Use natural, casual speech.No AI - like formalities.Act like the persona from the first word.
        6. NO CAT PUNS: Absolutely no cat puns(reserved for Miko).
        7. GREETINGS: Generate 3 short, personality - rich greetings in an array called "greetings".They must be primarily ${targetLangName} or ${targetLangName} mixed with one native word.
        8. FACE SELECTION: Choose the best faceType from this pool:
        - 'aarav', 'kabir', 'deepak', 'custom_male_1', 'custom_male_2', 'global_male_1', 'global_male_2', 'global_male_3'
            - 'meera', 'zoya', 'custom_female_1', 'custom_female_2', 'global_female_1', 'global_female_2', 'global_female_3'
            - 'arjun'(Intellectual Male)
           ${usedFaceTypes.length > 0 ? `IMPORTANT: The following face types are already in use by other characters. You MUST NOT use any of these: ${usedFaceTypes.join(', ')}` : ''}
        9. VOICE SELECTION: Strictly match gender:
        - Male: onyx, fable, echo
            - Female: nova, shimmer, alloy

        Return as JSON with keys: "prompt", "voice", "faceType", "greetings".`;

        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    { role: 'system', content: 'You are a creative character designer. Return ONLY valid JSON.' },
                    { role: 'user', content: systemPrompt },
                ],
                options: { response_format: { type: 'json_object' } },
            });
            return JSON.parse(data.content);
        } catch (error) {
            console.error('Character Generation Error:', error);
            throw error;
        }
    }

    async getDefinitions(text, targetLangName = 'English', nativeLangName = 'English') {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `Extract the difficult or key ${targetLangName} words from the following text and provide their simplified definitions in ${nativeLangName}, parts of speech, and an example sentence in ${targetLangName} for each.
                        Format the response as a JSON array of objects with keys: "word", "definition", "partOfSpeech", "example".
                        Keep the definitions simple and encouraging, like a friendly cat coach.`,
                    },
                    { role: 'user', content: text },
                ],
                options: { temperature: 0.3, response_format: { type: 'json_object' } },
            });
            const parsed = JSON.parse(data.content);
            return parsed.words || parsed.definitions || Object.values(parsed)[0];
        } catch (error) {
            console.error('Dictionary Error:', error);
            return null;
        }
    }

    async getFeedback(text, targetLangName = 'English', nativeLangName = 'English') {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `You are Miko's writing assistant and a ${targetLangName} teacher. Analyze the user's sentence for grammar, spelling, and style in ${targetLangName}.
                        
                        CRITICAL INSTRUCTIONS:
            1. If there are any errors, the "corrected" field MUST reflect the actual fixes.Do not return the same sentence as the original if an error is identified.
                        2. Even if the grammar is perfect, you can suggest a more "purr-mium"(natural or advanced) way to say it in the "corrected" field in ${targetLangName}.
                        3. Provide a detailed analysis in JSON format, including:
        - "original": the exact original text provided by the user.
                           - "corrected": the improved or fixed version.
                           - "errors": an array of objects for each specific mistake.
                           - "suggestions": ways to make it sound more like a native ${targetLangName} speaker.
                           - "encouragement": a warm, cat-themed note from Miko(use puns!) in ${nativeLangName}.
                        
                        For the "errors" array, write "explanation" in ${nativeLangName} to be easy to understand.
                        Example Error Object: { "type": "grammar", "error": "i is", "correction": "I am", "explanation": "We use 'am' with the first person 'I'." }
                        
                        Only return valid JSON.`,
                    },
                    { role: 'user', content: text },
                ],
                options: { temperature: 0.3, response_format: { type: 'json_object' } },
            });
            return JSON.parse(data.content);
        } catch (error) {
            console.error('Feedback Error:', error);
            return null;
        }
    }

    async getSuggestions(targetLangName = 'English') {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `You are Miko's assistant. Based on the conversation history, provide 3 short, natural, and helpful ${targetLangName} response suggestions for the user. 
            - Keep them brief(max 10 words).
                        - Vary the tone(one curious, one polite, one casual).
                        - Use simple vocabulary suitable for a learner.
                        
                        Return a JSON object with a "suggestions" key containing an array of strings.
                        Only return valid JSON.`,
                    },
                    ...this.history,
                    { role: 'user', content: 'Give me 3 short suggestions for what I could say next.' },
                ],
                options: { temperature: 0.7, response_format: { type: 'json_object' } },
            });
            const parsed = JSON.parse(data.content);
            return parsed.suggestions || [];
        } catch (error) {
            console.error('Suggestions Error:', error);
            return [];
        }
    }

    resetHistory() {
        this.history = [];
    }
}

export const aiService = new AIService();
