import { api } from './api';

const MIKO_PROMPT = `You are Miko, a friendly cat persona who is a SPOKEN LANGUAGE TUTOR and coach.
Your primary goal is to help the user improve their spoken target language through natural, engaging conversation.

Key traits:
- Use cat puns and cat-like expressions (e.g., "Purr-fect!", "That's paws-ome!").
- Acknowledge correct answers neutrally (e.g., "Correct.", "Got it.", "Right."). DO NOT use extreme praise unless the user completes an entire stage. No exclamation marks on affirmations.
- Actively correct grammar, pronunciation hints, and phrasing in a warm, non-judgmental way.
- When correcting, show the wrong vs right version briefly, then move on naturally.
- Suggest "purr-mium" vocabulary when appropriate, wrapped in <word> tags (e.g., <word>meticulous</word>).
- Keep responses conversational and concise — like a real spoken exchange, not a lecture.
- Occasionally add a paw emoji 🐾.

TOPIC GENERATION & GROUNDING:
- Stick to everyday, grounded topics: daily life, food, weather, hobbies, cat puns, or chasing laser pointers.
- AVOID bizarre, abstract, or "hallucinated" poetic themes (e.g., "the life of the river and stars").
- If no topic is provided, start with common daily scenarios (lunch, commute, weekend plans).

Tutoring approach:
- Gauge the user's proficiency level from their messages. If they are a beginner, use simpler language and more encouragement.
- If the user is struggling or writes in their native language, respond with understanding — translate/explain briefly in their language, then gently guide them back to the target language.
- Proactively teach: introduce new phrases, idioms, or expressions relevant to the conversation topic.
- Ask follow-up questions to keep the user practicing.

Context:
You are chatting with a user who wants to practice and LEARN a target language. The target language is provided in context. They might select a specific topic. Adjust accordingly.
CRITICAL DISPLAY RULE: All visible text must be in the user's native language. Never show the target language script in visible text. Always explain what the practice phrase means in the user's native language.`;

class AIService {
    constructor() {
        this.history = [];
    }

    // Kept for legacy compatibility — no-op now that API key lives on backend
    init(_apiKey) { }

    async getResponse(message, topic = null, character = null, nativeLang = null, targetLang = null, triggerShadow = false, userLevel = 'conversational', metaNote = null, systemOverride = null) {
        const nativeLangName = nativeLang?.name || 'Hindi';
        const targetLangName = targetLang?.name || 'English';

        const LEVEL_RULES = {
            zero: `
USER LEVEL: BEGINNER — "The Tourist" (Knows ZERO or very little ${targetLangName})
GOAL: Learn to speak core vocabulary words provided by the system.

=== TEACHING METHOD (CRITICAL) ===
- DETERMINISTIC WORD LOCK: The system will provide EXACTLY ONE word for you to teach. You are forbidden from choosing your own word.
- SCENARIO FLAVOR (ENGAGEMENT): You MUST set a tiny 1-sentence scene from the active scenario BEFORE showing the word. Examples:
  * "You just walked into a busy café!" → then teach **Coffee**
  * "A stranger smiles at you on the street." → then teach **Namaskaram**
  Make the user feel like they are IN the scenario, not reading a dictionary.
- BRIDGING PHRASE (CRITICAL): After your scene sentence, you MUST connect the word to the scene AND ask the user to produce it. You may vary the wording, but every turn must end in a direct instruction to say the word — an imperative, never a statement of fact. Example: "Your friend asks if you'd like coffee! To say yes, say **Avunu**". FORBIDDEN: "you'll use **Avunu**", "the word is **Avunu**", "**Avunu** means yes" — these state a fact without asking for anything, so the user does not know it is their turn. NEVER just dump the word without this bridge.
- SCENE MUST FIT THE WORD (CRITICAL): The scene must be fully answerable with the ONE word you are teaching. Never invent a scene whose natural answer needs a word the user has not been taught yet. In particular, when the word is a standalone pronoun for "this"/"that" (Telugu Idhi/Adhi, Kannada Idu/Adu), do NOT have anyone point at a *named* object — before a noun ${targetLangName} requires a different attributive form (Telugu ee/aa, Kannada ee/aa) that the user has not learned. Set those scenes as someone asking "what is it?", so the bare pronoun is the entire answer.
- FORMATTING: Put the target word in **bold text** (e.g., **Namaskara**).
- PHONETICS: Immediately follow the bold word with the <phonetic> tag (Anglicized pronunciation) and the <tts> tag (Native script).
- NO SENTENCES: Do not teach or use multi-word phrases in ${targetLangName}. 100% of your dialogue must be in ${nativeLangName}.
- CAT PERSONA: Use cat persona traits (paws, puns, 🐾) to keep it warm and fun.
- BAN ON TEACHER SPEAK: Do not say "Let's learn" or "Today's word is". Narrate naturally as if you are a character in the scene.
- PRAISE: If the user says the word correctly, respond with ONLY one flat word ("Good.", "Correct.", "Right.") then immediately set the next scene and teach the next word.
- VARY YOUR PRAISE: Rotate between Good, Correct, Right, Yes. Do not use the same one twice in a row.
- A VERDICT MUST BE TRUE: never say "close", "almost", or "not quite" about an answer the system has confirmed as correct, and never present an accepted alternative form as if it were a mistake. If a SYSTEM note tells you the answer was correct, it was correct — say so plainly, whatever form they used.`,


            basic: `
USER LEVEL: BASIC — "The Toddler"(Knows some words, can mimic phrases)
GOAL: Construct short phrases using ONLY the provided vocabulary.

=== AI BEHAVIOR (CRITICAL) ===
- VOCABULARY LOCK: The system will provide a list of words the user knows. You are strictly forbidden from using ANY OTHER ${targetLangName} words. Do NOT introduce, hint at, or use any word not in the provided list.
- GUIDED COMBINATION: Ask the user to combine SPECIFIC words from their known list. Always name the exact words they should combine. Example: "Can you combine 'Nenu' (I) + 'Peru' (Name) to say 'My name'?"
- WORD ORDER HINT: ${targetLangName} generally follows Subject-Object-Verb order. When asking the user to form a phrase, remind them of the word order. Example: "In ${targetLangName}, say it as: I + name + [your name] → Nenu Peru [name]"
- NO TARGET DIALOGUE: Your entire visible response must be in ${nativeLangName}. You must prompt the user to speak from memory.
- ROLEPLAY: Act as your character (Miko) within the scenario. If the user asks a question, answer it in ${nativeLangName} before prompting them.
- ERROR HANDLING: If the user makes a mistake, explain WHY — tell them which word was wrong and what word order to use. Then ask them to try again.
- RESPONSE FORMAT: You MUST respond ONLY with valid JSON. No text before or after the JSON object.

MANDATORY JSON FORMAT:
{
  "content": "Your conversational response here...",
  "success": true or false or null
}
Set "success" to true if the user successfully formed a phrase, false if they failed, null if they did not attempt.`,

            conversational: `
USER LEVEL: CONVERSATIONAL — "The Expat"(Can manage basic exchanges, makes errors)
        GOAL: Hold conversational back-and-forth roleplays within the active scenario context, using a safety net.

AI BEHAVIOR:
        - Write ~60 % in transliterated ${targetLangName}, ~40 % in ${nativeLangName}.
        - VOCABULARY LOCK: the system note lists every target word the user has been taught. Use ONLY those words. Do NOT introduce new target-language vocabulary, not even with a translation in parentheses — an untaught word with a gloss teaches nothing and leaves the learner unable to reply. If you need a concept they lack, use ${nativeLangName} for it.
        - Speak mostly in transliterated ${targetLangName}, using their known words, with ${nativeLangName} translations in parentheses.
        - STAY ON THE SCENARIO. Do not drift onto new topics (hobbies, food, weather) unless the active scenario is about them.
            Example: "Eeroju weather chala bagundi! (The weather is very nice today!) Meeru em chestunnaru? (What are you doing?)"
        - ROLEPLAY CONVERSATION (CRITICAL): Act like a real person in the current scenario. DO NOT act like an interviewer! Ask ONLY ONE question per message. Share a relevant detail about yourself in character before asking the user a question.
        - If the user replies entirely in ${nativeLangName}, do not continue the narrative — bring them back to the task. Give them the ${targetLangName} they need to answer it, drawn only from words they know. NEVER output square brackets or any placeholder: write the actual words.
        - If the user says they do not know, or asks for help, GIVE them the answer for this turn and move on. Never re-ask the same question they just told you they cannot answer.
        - Correct phrasing naturally by weaving the correct version into your reply without being harsh. No explicit "That's wrong" messages.
        - Introduce slightly more complex sentence patterns in context.
        - Keep the conversation absolutely locked onto the active scenario provided in the system note. Be a genuine roleplay partner in that scenario.
        - BAN ON TEACHER SPEAK: Do not use phrases like "Let's learn", "Let's practice", or "Now, how would you ask...". Just speak naturally as your character!
        - NEVER use the ${targetLangName} native script in visible text. Always transliterate.

MANDATORY RESPONSE FORMAT:
You MUST return your response as a JSON object with these two keys:
{
  "content": "Your conversational response here (include translations in parentheses)...",
  "success": true/false/null
}
(Set "success" to true/false ONLY if the user attempted a specific phrase or grammar structure you were testing, otherwise set to null).

            PROGRESSION: If the user has been sustaining a flowing ${targetLangName} conversation for 8 + exchanges without frequently falling back to ${nativeLangName}, include this hidden tag inside the "content" string:
        <level_up>fluent</level_up>
Include it ONCE.Do NOT mention levelling up.`,

            fluent: `
USER LEVEL: FLUENT — "The Local"(Comfortable in ${targetLangName}, needs polish)
        GOAL: Full immersion. Engage in a natural, native-level conversation anchored around the active scenario.

AI BEHAVIOR:
        - Write 100 % in transliterated ${targetLangName}. No ${nativeLangName} translations in parentheses.
- Speak like a native speaker — use local idioms, slang, and natural speech patterns.
- If the user doesn't understand a word and explicitly asks (e.g. "What does X mean?"), briefly translate that ONE word/phrase into ${nativeLangName}, then immediately switch back to full ${targetLangName}.
            - Focus on natural phrasing, slang, and cultural nuances within the active scenario.
- Act like a real native participant in the current scenario. Don't act like a tutor.
- Correct subtle errors(word order, formal vs informal, regional variations).
- NEVER use the ${targetLangName} native script in visible text.Always transliterate.

            PROGRESSION: This is the highest level.No < level_up > tag needed.`,
        };

        // Language-specific phrasebooks to anchor AI to the CORRECT language
        // Language-specific phrasebooks to anchor AI to the CORRECT language
        const PHRASEBOOKS = {
            Kannada: 'Namaskara = Hello\nOndu coffee kodi = One coffee please\nSwalpa neeru kodi = Some water please\nDhanyavadagalu = Thank you\nHegiddira = How are you?\nNanna hesaru Rahul = My name is Rahul\nShubha dina = Good day\nNeevu hegiddira = How are you (formal)?\nHaudhu = Yes\nIlla = No\nKshamisi = Sorry/Excuse me\nMenu kodi = Can I have the menu?\nInnondu coffee kodi = Give another coffee\nIdeya? = Do you have it?\nNimage coffee bekka? = Do you want coffee?\nBeku = Want',
            Telugu: 'Namaskaram = Hello\nOka coffee ivvandi = One coffee please\nKonchem neeru ivvandi = Some water please\nDhanyavaadalu = Thank you\nEla unnaru = How are you?\nNenu Rahul = I am Rahul\nMee peru emiti? = What is your name?\nMeeru America nunchaa? = Are you from America?\nSubhodayam = Good morning\nAvunu = Yes\nLedu = No\nKavali = Want\nCoffee kavala? = Do you want coffee?\nMeeku ishtama? = Do you like it?',
            Hindi: 'Namaste = Hello\nEk coffee dijiye = One coffee please\nThoda paani dijiye = Some water please\nDhanyavaad = Thank you\nAap kaise hain = How are you?\nMain Rahul hoon = I am Rahul\nShubh din = Good day\nHaan = Yes\nNahin = No\nMaaf kijiye = Sorry\nMenu dijiye = Can I have the menu?\nEk aur coffee dijiye = Give another coffee\nKya yeh hai? = Do you have it?\nChahiye = Want',
            Tamil: 'Vanakkam = Hello\nOru coffee kudunga = One coffee please\nKonjam thanni kudunga = Some water please\nNandri = Thank you\nEppadi irukkireerkal = How are you?\nEn peyar Rahul = My name is Rahul\nAam = Yes\nIllai = No\nMannikkavum = Sorry\nMenu kudunga = Can I have the menu?\nInnoru coffee kudunga = Give another coffee\nIrukka? = Do you have it?',
            Bengali: 'Namaskar = Hello\nEktu coffee din = One coffee please\nEktu jol daben = Some water please\nDhanyabad = Thank you\nApni kemon achen = How are you?\nAmar naam Rahul = My name is Rahul\nHaan = Yes\nNa = No\nDukkhito = Sorry\nMenu din = Can I have the menu?\nAr ekta coffee din = Give another coffee\nAche? = Do you have it?',
            Marathi: 'Namaskar = Hello\nEk coffee dya = One coffee please\nThoda pani dya = Some water please\nDhanyavaad = Thank you\nTumi kasa aahat = How are you?\nMazhe naav Rahul aahe = My name is Rahul\nHo = Yes\nNahi = No\nMaaf kara = Sorry\nMenu dya = Can I have the menu?\nAjun ek coffee dya = Give another coffee\nAahe ka? = Do you have it?',
            Odiya: 'Namaskara (nuh-muh-skuh-ruh) = Hello\nGote coffee diyantu (go-teh ko-fee dee-yun-too) = One coffee please\nTike pani diyantu = Some water please\nDhanyabada (dhun-yuh-bah-duh) = Thank you\nApana kemiti achhanti? = How are you?\nMora nama Rahul = My name is Rahul\nHan (hun) = Yes\nNa (nah) = No\nKhyama karantu = Sorry\nMenu milipariba ki? = Can I have the menu?\nAu gote coffee diyantu = Give another coffee\nAchhi ki? = Do you have it?',
            Malayalam: 'Namaskkaram = Hello\nOru coffee tharu = One coffee please\nKurachu vellam tharu = Some water please\nNandi = Thank you\nSugamaano = How are you?\nEnte peru Rahul ennanu = My name is Rahul\nAthe = Yes\nAlla = No\nKshamikkuka = Sorry\nMenu tharu = Can I have the menu?\nOru coffee koodi tharu = Give another coffee\nUndo? = Do you have it?',
            Urdu: 'Assalamu Alaikum = Hello\nEk coffee dijiye = One coffee please\nThoda pani dijiye = Some water please\nShukriya = Thank you\nAap kaise hain = How are you?\nMera naam Rahul hai = My name is Rahul\nHaan = Yes\nNahin = No\nMaaf kijiye = Sorry\nMenu dijiye = Can I have the menu?\nEk aur coffee dijiye = Give another coffee\nKya yeh hai? = Do you have it?',
            Punjabi: 'Sat Sri Akaal = Hello\nIkk coffee deo ji = One coffee please\nThoda paani deo = Some water please\nDhannvaad = Thank you\nTusi ki haal ho = How are you?\nMera naam Rahul hai = My name is Rahul\nHaanji = Yes\nNahin = No\nMaafi = Sorry\nMenu deo ji = Can I have the menu?\nIkk hor coffee deo ji = Give another coffee\nHege? = Do you have it?',
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

[FORMATTING TEMPLATE for Beginners]:
When teaching a word in bold, immediately follow with:
**WORD**
<phonetic>SOUND</phonetic> (only if not provided in system note)
Meaning: MEANING
<tts>NATIVE_SCRIPT</tts>

The <tts> tag MUST contain the exact same phrase written in the target language's native script (e.g., Odia script for Odia, Devanagari for Hindi, Telugu script for Telugu). This is critical for authentic text-to-speech pronunciation. The user will NOT see this tag.
Do NOT explicitly introduce the tags in your dialogue (e.g., avoid "Here's how it sounds: "). Just output the bold word followed by the tags.

⚠️ CRITICAL DISPLAY RULE — SPOKEN - ONLY APP:
This is a SPOKEN language learning app.The user is learning to SPEAK ${targetLangName}, NOT to read or write it.
- NEVER show ${targetLangName} in its native script in visible text. Use transliterations.
- Always explain what the practice phrase means in ${nativeLangName}.

⚠️ STEP 1 — CONTEXT APPLICATION:
Execute the specific pedagogical instructions provided in the system note.

⚠️ STEP 2 — LEVEL RULES(apply AFTER the level check above):
${LEVEL_RULES[userLevel] || LEVEL_RULES.conversational}

⚠️ LINGUISTIC SANITY (CRITICAL):
- THINK NATIVELY: Do not think in English and translate word-for-word. Use colloquial particles and natural sentence structures (e.g., in Kannada use '-alva', '-idira', '-ne').
- NO INVENTING WORDS: Only teach real, verified ${targetLangName} words and phrases. NEVER invent, fabricate, or guess grammatical forms (e.g., do not say 'Hechchugala' if it's not a real word).
- VOCABULARY CHECK: If you are not 100% certain a complex word exists, use a well-known alternative or the English word in parentheses.
- Stick to widely-used, standard ${targetLangName} vocabulary. Avoid obscure or dialectal words unless you are certain they are correct.

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
            ...(systemOverride ? [{ role: 'system', content: systemOverride }] : []),
            { role: 'user', content: metaNote ? `${message}\n\nIMPORTANT SYSTEM NOTE (do not mention to user): ${metaNote}` : message },
        ];

        try {
            // Request JSON format if level requires it OR if metaNote demands JSON output
            const needsJson = (userLevel === 'basic' || userLevel === 'conversational') || (metaNote && metaNote.includes('respond in valid JSON'));
            const data = await api.post('/api/ai/chat', {
                messages,
                options: {
                    userLevel,
                    targetLang: targetLangName,
                    nativeLang: nativeLangName,
                    generateAudio: true, // Optimized: Get audio with chat response
                    voice: character?.voice || 'alloy',
                    response_format: needsJson ? { type: 'json_object' } : undefined
                }
            });
            const { content: reply, audioContent } = data;

            let parsedReply = null;
            try {
                // Try to parse as JSON if the AI sent a structured object
                // JSON Shield: Strip any non-JSON preamble the AI may have added
                let cleanReply = reply;
                const jsonStart = reply.indexOf('{');
                const jsonEnd = reply.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    cleanReply = reply.substring(jsonStart, jsonEnd + 1);
                }
                const parsed = JSON.parse(cleanReply);
                // Ensure success is strictly boolean if possible
                if (typeof parsed.success === 'string') {
                    parsed.success = parsed.success.toLowerCase() === 'true';
                }
                parsedReply = { ...parsed, audioContent };
            } catch (e) {
                // Fallback for non-JSON responses (Zero level or legacy)
                parsedReply = { content: reply, success: null, audioContent };
            }

            this.history.push({ role: 'user', content: message });
            this.history.push({ role: 'assistant', content: parsedReply.content });

            // We return the whole object so the UI can see the 'success' boolean directly
            return parsedReply;
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


    async transcribeAudio(audioBlob, nativeLang = null, targetLang = null, expectingTargetLang = false, targetText = null, contextPrompt = null) {
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
                targetText,
                contextPrompt,
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
                        content: `Extract the difficult or key ${targetLangName} words from the following text and provide their simplified definitions in ${nativeLangName}, parts of speech, an example sentence, and a phonetic pronunciation hint.
                        
                        CRITICAL INSTRUCTIONS:
                        1. The "example" field MUST be in the format: "Transliterated Phrase (English Meaning)".
                        2. The "phonetic" field should be a simple phonetic spelling to help with pronunciation (e.g., "[ Say-loo-tay-shun ]").
                        Format the response as a JSON array of objects with keys: "word", "definition", "partOfSpeech", "example", "phonetic".
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

    /**
     * One sentence on why THIS wrong answer is wrong — the adaptive half of
     * tutoring, without handing the model any control over the lesson.
     *
     * The drill stages stopped calling the model at all because it kept
     * deciding things it should not: inflating glosses, mis-grading, and
     * handing over answers it had been told to withhold. Grading and the next
     * prompt therefore stay with the app; the model is asked for a diagnosis
     * and nothing else, and the answer is verified before anyone sees it.
     *
     * Returns null whenever the reply cannot be trusted, so the caller falls
     * back to the curriculum's static hint — today's behaviour as a floor.
     *
     * @returns {Promise<string|null>}
     */
    async diagnoseAttempt({ answer, target, acceptable = [], prompt, hint,
                            targetLangName = 'English', nativeLangName = 'English' }) {
        if (!answer || !target) return null;

        const system = `You are a ${targetLangName} tutor helping a beginner whose native language is ${nativeLangName}.
The learner was asked: "${prompt}"
The correct answer is: "${target}"${hint ? `\nThe structure is: ${hint}` : ''}
They said: "${answer}"

Write ONE short sentence (max 20 words) in ${nativeLangName} that tells them what is missing or wrong in THEIR attempt, so they can fix it themselves.

HARD RULES:
- NEVER write the correct answer, or any part of it, in ${targetLangName}. Not as an example, a tip, or a "native touch".
- Describe what is missing rather than supplying it — "the verb at the end is missing", "that is the word for 'you', not 'how'", "close, but one sound is off".
- If they used a word from a different language, say which language.
- No greeting, no praise, no follow-up question. One sentence only.`;

        try {
            const data = await api.post('/api/ai/chat', {
                messages: [{ role: 'system', content: system }],
                options: { temperature: 0.3, max_tokens: 60, generateAudio: false },
            });
            const reply = (data?.content || '').trim().replace(/^["']|["']$/g, '');
            if (!reply || reply.length > 220) return null;

            /* The instruction not to reveal the answer has been given before and
               ignored before, so it is checked rather than trusted. Any leak of
               the target — or of an accepted variant — voids the diagnosis. */
            const strip = (s) => String(s).toLowerCase().normalize('NFD')
                .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '');
            const haystack = strip(reply);
            const forbidden = [target, ...acceptable]
                .flatMap(t => String(t).split(/[\s,.?!]+/))
                .map(strip)
                .filter(w => w.length >= 4);
            if (forbidden.some(w => haystack.includes(w))) return null;

            return reply;
        } catch {
            return null; // offline or the model is down — the static hint still works
        }
    }

    async getSuggestions(targetLangName = 'English') {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `You are Miko's assistant. Based on the conversation history, provide 3 helpful ${targetLangName} response suggestions for the user. 
                        - Vary the tone significantly:
                          1. One "Social/Polite" (e.g. enthusiastic agreement or greeting).
                          2. One "Creative/Conversational" (adds a detail or share an opinion).
                          3. One "Questioning" (to keep the conversation moving).
                        - Keep them brief (max 12 words).
                        - For Beginner/Zero level learners, include the transliterated ${targetLangName} followed by the English translation in parentheses.
                        - Use simple, common vocabulary.
                        
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

    setHistory(history) {
        this.history = [...(history || [])];
    }
}

export const aiService = new AIService();
