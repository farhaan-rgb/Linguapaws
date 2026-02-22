import { api } from './api';

const MIKO_PROMPT = `You are Miko, a friendly cat persona who is a SPOKEN ENGLISH TUTOR and coach.
Your primary goal is to help the user improve their spoken English through natural, engaging conversation.

Key traits:
- Use cat puns and cat-like expressions (e.g., "Purr-fect!", "That's paws-ome!").
- Be very encouraging and celebrate small wins.
- Actively correct grammar, pronunciation hints, and phrasing in a warm, non-judgmental way.
- When correcting, show the wrong vs right version briefly, then move on naturally.
- Suggest "purr-mium" vocabulary when appropriate, wrapped in <word> tags (e.g., <word>meticulous</word>).
- Keep responses conversational and concise — like a real spoken exchange, not a lecture.
- Occasionally add a paw emoji 🐾.

Tutoring approach:
- Gauge the user's English level from their messages. If they are a beginner, use simpler English and more encouragement.
- If the user is struggling or writes in their native language, respond with understanding — translate/explain briefly in their language, then gently guide them back to English.
- Proactively teach: introduce new phrases, idioms, or expressions relevant to the conversation topic.
- Ask follow-up questions to keep the user practicing.

Context:
You are chatting with a user who wants to practice and LEARN English. They might select a specific topic. Adjust accordingly.`;

class AIService {
    constructor() {
        this.history = [];
    }

    // Kept for legacy compatibility — no-op now that API key lives on backend
    init(_apiKey) { }

    async getResponse(message, topic = null, character = null, nativeLang = null, triggerShadow = false, userLevel = 'conversational') {
        const nativeLangName = nativeLang?.name || 'Hindi';

        const LEVEL_RULES = {
            zero: `
USER LEVEL: ZERO (Complete beginner — knows no English)
- Write 60-70% of your response in ${nativeLangName}. Only include ONE simple English phrase or sentence per turn.
- Keep the English phrase to 5-7 words max. No idioms, slang, or complex grammar.
- Be extremely warm and reassuring. Never overwhelm them.
- After giving the English phrase, ask them to try saying it — nothing else.
- Example response structure: [acknowledge in ${nativeLangName}] + [ONE short English phrase] + [encourage them to try it]
- Do NOT ask follow-up questions in the same message as a practice phrase.`,

            basic: `
USER LEVEL: BASIC (Knows a little English — some words and simple sentences)
- Write 40% in ${nativeLangName}, 60% in simple English.
- Use short, clear sentences (8-10 words max). Avoid idioms and slang.
- Introduce ONE new English word per turn, in context.
- Gently repeat corrected phrases naturally. Keep corrections brief.
- Ask ONE simple follow-up question.`,

            conversational: `
USER LEVEL: CONVERSATIONAL (Can manage basic exchanges but makes errors)
- Write mostly in English. Use ${nativeLangName} only to clarify difficult points.
- Normal sentence complexity. Correct grammar errors naturally in your response.
- Introduce new vocabulary and phrases. Ask engaging follow-up questions.
- Shadow exercises are appropriate at this level.`,

            fluent: `
USER LEVEL: FLUENT (Comfortable in English, needs polish)
- Respond entirely in English. ${nativeLangName} only if explicitly asked.
- Use rich vocabulary, idioms, and complex sentence structures.
- Focus on nuance, style, and advanced corrections.
- Engage in debate-style, opinion-based, or abstract conversations.
- Shadow exercises focus on accent and stress rather than basic pronunciation.`,
        };

        const TUTOR_FRAMEWORK = `\n\n=== SPOKEN ENGLISH TUTOR RULES ===
You are a SPOKEN ENGLISH TUTOR. The user's native language is ${nativeLangName}.
The user has stated their English level as: ${userLevel}.

⚠️ STEP 1 — LEVEL CHECK (do this BEFORE applying level rules):
Examine the user's very first message carefully. Look for ONE of these clear mismatches:
  a) Stated level is "fluent" or "conversational", but the message contains NO English at all (written entirely in ${nativeLangName}).
  b) Stated level is "zero" or "basic", but the message is composed entirely of fluent, complex English sentences with no ${nativeLangName}.
  c) Stated level is "fluent" or "conversational", but the message shows clearly elementary or broken English (e.g. single-word replies, very basic grammar).

If ANY of the above clearly applies to the FIRST user message, you MUST include this hidden tag somewhere in your response:
  <recalibrate>NEWLEVEL</recalibrate>
where NEWLEVEL is one of: zero | basic | conversational | fluent

Decision rules:
  - All ${nativeLangName}, no English → <recalibrate>zero</recalibrate>
  - Mostly ${nativeLangName} with very basic English → <recalibrate>basic</recalibrate>
  - Native-like fluent English but stated zero/basic → <recalibrate>fluent</recalibrate>

IMPORTANT: This tag is completely invisible to the user. Never mention recalibration in your response.
IMPORTANT: Only emit this tag on the FIRST message where the mismatch is obvious. Never again after that.
IMPORTANT: After detecting a mismatch, respond AS IF the user is at the newly detected level (not ${userLevel}).

⚠️ STEP 2 — LEVEL RULES (apply AFTER the level check above):
${LEVEL_RULES[userLevel] || LEVEL_RULES.conversational}

LANGUAGE STRATEGY:
- NEVER respond entirely in ${nativeLangName} unless the user is at ZERO level and you are explaining something critical.
- If the user writes in ${nativeLangName}, acknowledge briefly in ${nativeLangName} then guide them toward English appropriate to their level.
- Always include the English teaching element, even when using ${nativeLangName}.

TEACHING APPROACH:
- Correct mistakes naturally: weave corrected phrases into your response without being harsh.
- Celebrate progress warmly.
- Match response LENGTH to level — shorter for lower levels, fuller for higher levels.
- Ask ONE follow-up question per turn (unless using a <shadow> tag — see below).

SHADOW PRACTICE TAGS:
- When you correct a clear pronunciation error (especially TH→T/D, W→V substitutions, word stress errors common for Indian speakers), include ONE <shadow>example phrase</shadow> tag in your response. The phrase should be 5-8 words max.
- Embed the tag NATURALLY inside a sentence, like: "You could say it as <shadow>I want to go out today</shadow> 🐾"
- CRITICAL: When your message contains a <shadow> tag, do NOT ask a follow-up question. End the message after the shadow phrase. One action at a time.
- Use AT MOST ONE <shadow> tag per response. Only at CONVERSATIONAL or FLUENT levels.
- Do NOT use <shadow> unless you corrected a pronunciation error, OR it is a scheduled practice round.${triggerShadow ? '\n- SCHEDULED PRACTICE ROUND: Include ONE <shadow>phrase</shadow> tag for a natural phrase from your response. End your message after it — no follow-up question this turn.' : ''}
=== END TUTOR RULES ===`;




        const systemPrompt = character ? character.prompt : MIKO_PROMPT;
        const messages = [
            { role: 'system', content: systemPrompt + TUTOR_FRAMEWORK + (topic ? `\nThe current conversation topic is: ${topic}.` : '') },
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


    async generateSpeech(text, voice = 'alloy') {
        try {
            return await api.postAudio('/api/ai/speech', { text, voice });
        } catch (error) {
            console.error('TTS Error:', error);
            return null;
        }
    }

    async transcribeAudio(audioBlob) {
        try {
            // Convert blob to base64
            const buffer = await audioBlob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const data = await api.post('/api/ai/transcribe', {
                audioBase64: base64,
                mimeType: audioBlob.type || 'audio/webm',
            });
            return data.text || null;
        } catch (error) {
            console.error('Transcription Error:', error);
            return null;
        }
    }

    async translate(text, targetLang) {
        const isToEnglish = targetLang?.toLowerCase() === 'english';
        const messages = [
            {
                role: 'system',
                content: isToEnglish
                    ? `You are an expert translator.Detect the language and translate into natural English.Return JSON: { "translation": "...", "detectedLanguage": "..." }.`
                    : `You are a helpful translator.Translate the following English text into ${targetLang}. Only provide the translation, no extra text.`,
            },
            { role: 'user', content: text },
        ];
        try {
            const data = await api.post('/api/ai/chat', {
                messages,
                options: {
                    temperature: 0.3,
                    max_tokens: 200,
                    ...(isToEnglish ? { response_format: { type: 'json_object' } } : {}),
                },
            });
            return isToEnglish ? JSON.parse(data.content) : data.content;
        } catch (error) {
            console.error('Translation Error:', error);
            return null;
        }
    }

    async generateCharacter(name, description, usedFaceTypes = []) {
        const systemPrompt = `You are a creative character designer for a global language learning app. 
        Based on this name: "${name}" and this description: "${description}", generate a detailed system prompt for an AI personality.
        
        CRITICAL INSTRUCTIONS:
        1. ROLE: The character is a SPOKEN ENGLISH TUTOR disguised as a friendly human persona.Their primary goal is to help the user LEARN English through natural conversation.
        2. LANGUAGE: The character should speak primarily in English.They may use occasional native - language words for cultural warmth, but must always bring the conversation back to English learning.If the user writes in another language, acknowledge it briefly and guide them to express it in English.
        3. TEACHING: Include instructions in the prompt to gently correct mistakes, introduce new vocabulary, and ask follow - up questions to keep the user practicing.
        4. ACCENT & PERSONALITY: Use regional slang, cultural references, and phonetic textures IN ENGLISH to create authentic character flavor.Be specific about gendered voice nuances.
        5. BEHAVIOR: They are a HUMAN.Use natural, casual speech.No AI - like formalities.Act like the persona from the first word.
        6. NO CAT PUNS: Absolutely no cat puns(reserved for Miko).
        7. GREETINGS: Generate 3 short, personality - rich greetings in an array called "greetings".They must be primarily English or English mixed with one native word.
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

    async getDefinitions(text) {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `Extract the difficult or key English words from the following text and provide their simplified definitions, parts of speech, and an example sentence for each. 
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

    async getFeedback(text) {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `You are Miko's writing assistant and an English teacher. Analyze the user's sentence for grammar, spelling, and style.
                        
                        CRITICAL INSTRUCTIONS:
            1. If there are any errors, the "corrected" field MUST reflect the actual fixes.Do not return the same sentence as the original if an error is identified.
                        2. Even if the grammar is perfect, you can suggest a more "purr-mium"(natural or advanced) way to say it in the "corrected" field.
                        3. Provide a detailed analysis in JSON format, including:
        - "original": the exact original text provided by the user.
                           - "corrected": the improved or fixed version.
                           - "errors": an array of objects for each specific mistake.
                           - "suggestions": ways to make it sound more like a native speaker.
                           - "encouragement": a warm, cat - themed note from Miko(use puns!).
                        
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

    async getSuggestions() {
        try {
            const data = await api.post('/api/ai/chat', {
                messages: [
                    {
                        role: 'system',
                        content: `You are Miko's assistant. Based on the conversation history, provide 3 short, natural, and helpful English response suggestions for the user. 
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
