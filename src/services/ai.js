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
USER LEVEL: ZERO (Complete beginner — knows no ${targetLangName})
- Write 100% of your response in ${nativeLangName}.
- When asking them to speak ${targetLangName}, include ONE short practice phrase (5-7 words max).
- Include the exact target phrase inside <target>...</target> (target script) but show ONLY its pronunciation in ${nativeLangName} (native script, or Latin if ${nativeLangName} is English) in visible text. Always say what it means in ${nativeLangName}.
- Be extremely warm and reassuring. Never overwhelm them.
- After giving the practice phrase, ask them to try saying it — nothing else.
- Do NOT ask follow-up questions in the same message as a practice phrase.`,

            basic: `
USER LEVEL: BASIC (Knows a little ${targetLangName} — some words and simple sentences)
- Write 100% in ${nativeLangName}.
- Use short, clear sentences. Avoid idioms and slang.
- Introduce ONE new ${targetLangName} phrase per turn via pronunciation in ${nativeLangName} (native script, or Latin if ${nativeLangName} is English) and include the exact target phrase in <target>...</target>. Always say what it means in ${nativeLangName}.
- Gently repeat corrected phrases naturally. Keep corrections brief.
- Ask ONE simple follow-up question.`,

            conversational: `
USER LEVEL: CONVERSATIONAL (Can manage basic exchanges but makes errors)
- Write 100% in ${nativeLangName}.
- Normal sentence complexity. Correct grammar errors naturally in your response.
- Introduce new ${targetLangName} phrases via pronunciation in ${nativeLangName} (native script, or Latin if ${nativeLangName} is English) and include the exact target phrase in <target>...</target>. Always say what it means in ${nativeLangName}.
- Ask engaging follow-up questions.
- Shadow exercises are appropriate at this level.`,

            fluent: `
USER LEVEL: FLUENT (Comfortable in ${targetLangName}, needs polish)
- Write 100% in ${nativeLangName}.
- Use rich vocabulary and nuanced explanations in ${nativeLangName}.
- Provide advanced corrections and pronunciation coaching for ${targetLangName} using pronunciation in ${nativeLangName} (native script, or Latin if ${nativeLangName} is English) and include the exact target phrase in <target>...</target>. Always say what it means in ${nativeLangName}.
- Engage in deeper conversation topics in ${nativeLangName}.`,
        };

        const TUTOR_FRAMEWORK = `\n\n=== SPOKEN LANGUAGE TUTOR RULES ===
You are a SPOKEN LANGUAGE TUTOR. The target language is ${targetLangName}. The user's native language is ${nativeLangName}.
The user has stated their ${targetLangName} level as: ${userLevel}.

⚠️ STEP 1 — LEVEL CHECK (do this BEFORE applying level rules):
Examine the user's very first message carefully. Look for ONE of these clear mismatches:
  a) Stated level is "fluent" or "conversational", but the message contains NO ${targetLangName} at all (written entirely in ${nativeLangName}).
  b) Stated level is "zero" or "basic", but the message is composed entirely of fluent, complex ${targetLangName} sentences with no ${nativeLangName}.
  c) Stated level is "fluent" or "conversational", but the message shows clearly elementary or broken ${targetLangName} (e.g. single-word replies, very basic grammar).

If ANY of the above clearly applies to the FIRST user message, you MUST include this hidden tag somewhere in your response:
  <recalibrate>NEWLEVEL</recalibrate>
where NEWLEVEL is one of: zero | basic | conversational | fluent

Decision rules:
  - All ${nativeLangName}, no ${targetLangName} → <recalibrate>zero</recalibrate>
  - Mostly ${nativeLangName} with very basic ${targetLangName} → <recalibrate>basic</recalibrate>
  - Native-like fluent ${targetLangName} but stated zero/basic → <recalibrate>fluent</recalibrate>

IMPORTANT: This tag is completely invisible to the user. Never mention recalibration in your response.
IMPORTANT: Only emit this tag on the FIRST message where the mismatch is obvious. Never again after that.
IMPORTANT: After detecting a mismatch, respond AS IF the user is at the newly detected level (not ${userLevel}).

⚠️ STEP 2 — LEVEL RULES (apply AFTER the level check above):
${LEVEL_RULES[userLevel] || LEVEL_RULES.conversational}

LANGUAGE STRATEGY:
- Respond ONLY in ${nativeLangName}.
- NEVER show ${targetLangName} script in visible text.
- Always include the ${targetLangName} teaching element using pronunciation in ${nativeLangName} (native script, or Latin if ${nativeLangName} is English) and a hidden <target>...</target> tag. Always include the meaning in ${nativeLangName}.

TEACHING APPROACH:
- Correct mistakes naturally: weave corrected phrases into your response without being harsh.
- Celebrate progress warmly.
- Match response LENGTH to level — shorter for lower levels, fuller for higher levels.
- Ask ONE follow-up question per turn (unless using a <shadow> tag — see below).

SHADOW PRACTICE:
- Do NOT use <shadow> tags. Shadow cards are disabled in chat.
=== END TUTOR RULES ===`;




        const systemPrompt = character ? character.prompt : MIKO_PROMPT;
        const messages = [
            { role: 'system', content: systemPrompt + TUTOR_FRAMEWORK + (topic ? `\nThe current conversation topic is: ${topic}.` : '') },
            ...(metaNote ? [{ role: 'system', content: `IMPORTANT NOTE (do not mention this to the user): ${metaNote}` }] : []),
            ...this.history,
            { role: 'user', content: message },
        ];

        try {
            const data = await api.post('/api/ai/chat', { messages });
            const reply = data.content;
            this.history.push({ role: 'user', content: message });
            this.history.push({ role: 'assistant', content: reply });
            return reply;
        } catch (error) {
            console.error('Chat Error:', error);
            return "Oops! My whiskers got tangled. Can you try again? 😿";
        }
    }


    async generateSpeech(text, voice = 'alloy', targetLang = null) {
        try {
            return await api.postAudio('/api/ai/speech', { text, voice, targetLang });
        } catch (error) {
            console.error('TTS Error:', error);
            return null;
        }
    }

    async transcribeAudio(audioBlob, language = null) {
        try {
            // Convert blob to base64
            const buffer = await audioBlob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const data = await api.post('/api/ai/transcribe', {
                audioBase64: base64,
                mimeType: audioBlob.type || 'audio/webm',
                language,
            });
            return data.text || null;
        } catch (error) {
            console.error('Transcription Error:', error);
            return null;
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
