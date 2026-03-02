import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { getStoredJSON, setStoredJSON } from '../utils/storage';

// Question and level labels in each supported native language
const TRANSLATIONS = {
    hi: {
        question: 'आपको कितनी {n} आती है?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'बिलकुल नहीं', sub: '{n} से बिल्कुल अनजान' },
            { id: 'basic', icon: '🌿', label: 'थोड़ी बहुत', sub: 'कुछ शब्द और आसान वाक्य' },
            { id: 'conversational', icon: '🌳', label: 'थोड़ी बातचीत', sub: 'साधारण बात कर सकता/सकती हूँ' },
            { id: 'fluent', icon: '⭐', label: 'काफी सहज', sub: 'अच्छे से बोल सकता/सकती हूँ' },
        ],
    },
    te: {
        question: 'మీకు ఎంత {n} వచ్చు?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'అసలు రాదు', sub: '{n} అసలు తెలియదు' },
            { id: 'basic', icon: '🌿', label: 'కొంచెం తెలుసు', sub: 'కొన్ని మాటలు మరియు వాక్యాలు' },
            { id: 'conversational', icon: '🌳', label: 'కొంత మాట్లాడగలను', sub: 'సాధారణ సంభాషణ చేయగలను' },
            { id: 'fluent', icon: '⭐', label: 'చాలా comfortable', sub: 'బాగా మాట్లాడగలను' },
        ],
    },
    mr: {
        question: 'तुम्हाला किती {n} येते?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'अजिबात नाही', sub: '{n} अजिबात येत नाही' },
            { id: 'basic', icon: '🌿', label: 'थोडी फार', sub: 'काही शब्द आणि वाक्ये' },
            { id: 'conversational', icon: '🌳', label: 'थोडी बोलता येते', sub: 'साधी संभाषणे करू शकतो/शकते' },
            { id: 'fluent', icon: '⭐', label: 'बऱ्यापैकी', sub: 'चांगले बोलू शकतो/शकते' },
        ],
    },
    bn: {
        question: 'আপনি কতটা {n} জানেন?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'একদমই না', sub: '{n} একদম বুঝি না' },
            { id: 'basic', icon: '🌿', label: 'একটু একটু', sub: 'কিছু শব্দ ও বাক্য জানি' },
            { id: 'conversational', icon: '🌳', label: 'সামান্য বলতে পারি', sub: 'সাধারণ কথোপকথন করতে পারি' },
            { id: 'fluent', icon: '⭐', label: 'বেশ ভালো', sub: 'অনায়াসে কথা বলতে পারি' },
        ],
    },
    ta: {
        question: 'உங்களுக்கு எவ்வளவு {n} தெரியும்?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'ஒன்றும் தெரியாது', sub: '{n} அறவே தெரியாது' },
            { id: 'basic', icon: '🌿', label: 'கொஞ்சம் தெரியும்', sub: 'சில வார்த்தைகள் தெரியும்' },
            { id: 'conversational', icon: '🌳', label: 'கொஞ்சம் பேசலாம்', sub: 'எளிய உரையாடல் செய்யலாம்' },
            { id: 'fluent', icon: '⭐', label: 'நன்றாக பேசலாம்', sub: 'தாராளமாக பேசுகிறேன்' },
        ],
    },
    kn: {
        question: 'ನಿಮಗೆ ಎಷ್ಟು {n} ಗೊತ್ತು?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'ಏನೂ ಗೊತ್ತಿಲ್ಲ', sub: '{n} ಸ್ವಲ್ಪವೂ ಗೊತ್ತಿಲ್ಲ' },
            { id: 'basic', icon: '🌿', label: 'ಸ್ವಲ್ಪ ಗೊತ್ತಿದೆ', sub: 'ಕೆಲವು ಪದಗಳು ಮತ್ತು ವಾಕ್ಯಗಳು' },
            { id: 'conversational', icon: '🌳', label: 'ಸ್ವಲ್ಪ ಮಾತಾಡಬಹುದು', sub: 'ಸರಳ ಸಂಭಾಷಣೆ ಮಾಡಬಹುದು' },
            { id: 'fluent', icon: '⭐', label: 'ಚೆನ್ನಾಗಿ ಮಾತಾಡಬಹುದು', sub: 'ಧಾರಾಳವಾಗಿ ಮಾತಾಡಬಹುದು' },
        ],
    },
    gu: {
        question: 'તમને કેટલી {n} આવડે છે?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'બિલકુલ નહીં', sub: '{n} બિલકુલ આવડતી નથી' },
            { id: 'basic', icon: '🌿', label: 'થોડી ઘણી', sub: 'કેટલાક શબ્દો અને વાક્યો' },
            { id: 'conversational', icon: '🌳', label: 'થોડી વાતચીત', sub: 'સામાન્ય વાત કરી શકું' },
            { id: 'fluent', icon: '⭐', label: 'ઘણી સારી', sub: 'સારી રીતે બોલી શકું' },
        ],
    },
    pa: {
        question: 'ਤੁਹਾਨੂੰ ਕਿੰਨੀ {n} ਆਉਂਦੀ ਹੈ?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'ਬਿਲਕੁਲ ਨਹੀਂ', sub: '{n} ਬਿਲਕੁਲ ਨਹੀਂ ਆਉਂਦੀ' },
            { id: 'basic', icon: '🌿', label: 'ਥੋੜੀ ਬਹੁਤ', sub: 'ਕੁਝ ਸ਼ਬਦ ਅਤੇ ਵਾਕ' },
            { id: 'conversational', icon: '🌳', label: 'ਥੋੜੀ ਗੱਲਬਾਤ', sub: 'ਸਾਧਾਰਨ ਗੱਲ ਕਰ ਸਕਦਾ/ਸਕਦੀ ਹਾਂ' },
            { id: 'fluent', icon: '⭐', label: 'ਬਹੁਤ ਵਧੀਆ', sub: 'ਚੰਗੀ ਤਰ੍ਹਾਂ ਬੋਲ ਸਕਦਾ/ਸਕਦੀ ਹਾਂ' },
        ],
    },
    or: {
        question: 'ତୁମ {n} କେତେ ଜଣା?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'ଆଦୌ ଜଣା ନାହିଁ', sub: '{n} ଆଦୌ ଜଣାଯାଏ ନାହିଁ' },
            { id: 'basic', icon: '🌿', label: 'ଅଳ୍ପ ଅଳ୍ପ ଜଣା', sub: 'କିଛି ଶବ୍ଦ ଓ ବାକ୍ୟ ଜଣା' },
            { id: 'conversational', icon: '🌳', label: 'ଅଳ୍ପ କଥା ହୋଇ ପାରେ', sub: 'ସାଧାରଣ କଥାବାର୍ତ୍ତା ହୋଇ ପାରେ' },
            { id: 'fluent', icon: '⭐', label: 'ବେଶ ଭଲ ଜଣା', sub: 'ଭଲ ଭାବରେ କଥା ହୋଇ ପାରେ' },
        ],
    },
    ml: {
        question: 'നിങ്ങൾക്ക് എത്ര {n} അറിയാം?',
        levels: [
            { id: 'zero', icon: '🌱', label: 'ഒട്ടും അറിയില്ല', sub: '{n} ഒട്ടും പഠിച്ചിട്ടില്ല' },
            { id: 'basic', icon: '🌿', label: 'അൽപ്പം അറിയാം', sub: 'ചില വാക്കുകളും വാക്യങ്ങളും' },
            { id: 'conversational', icon: '🌳', label: 'കുറച്ച് സംസാരിക്കാം', sub: 'ലളിതമായ സംഭാഷണം ചെയ്യാം' },
            { id: 'fluent', icon: '⭐', label: 'നന്നായി സംസാരിക്കാം', sub: 'ആത്മവിശ്വാസത്തോടെ സംസാരിക്കാം' },
        ],
    },
    ur: {
        question: 'آپ کتنی {n} جانتے ہیں؟',
        levels: [
            { id: 'zero', icon: '🌱', label: 'بالکل نہیں', sub: '{n} بالکل نہیں آتی' },
            { id: 'basic', icon: '🌿', label: 'تھوڑی بہت', sub: 'کچھ الفاظ اور جملے' },
            { id: 'conversational', icon: '🌳', label: 'تھوڑی بات چیت', sub: 'معمولی گفتگو کر سکتا/سکتی ہوں' },
            { id: 'fluent', icon: '⭐', label: 'کافی اچھی', sub: 'اچھی طرح بول سکتا/سکتی ہوں' },
        ],
    },
};

// Default fallback
const FALLBACK = {
    question: 'How much {n} do you know?',
    levels: [
        { id: 'zero', icon: '🌱', label: 'None at all', sub: 'Complete beginner' },
        { id: 'basic', icon: '🌿', label: 'A little', sub: 'Some words and simple sentences' },
        { id: 'conversational', icon: '🌳', label: 'Some conversations', sub: 'Can manage basic exchanges' },
        { id: 'fluent', icon: '⭐', label: 'Quite comfortable', sub: 'Can speak with confidence' },
    ],
};

export default function LevelSelect() {
    const navigate = useNavigate();
    const { t: tr } = useTranslation();
    const [selected, setSelected] = useState(null);

    const nativeLang = getStoredJSON('linguapaws_native_lang', {});
    const targetLang = getStoredJSON('linguapaws_target_lang', {});
    const targetName = targetLang?.name || 'English';
    const t = TRANSLATIONS[nativeLang?.id] || FALLBACK;
    const applyTarget = (text) => (text || '').replace('{n}', targetName);
    const question = applyTarget(t.question);

    const handleSelect = (level) => {
        setSelected(level.id);
        const levelData = { id: level.id, label: level.label };
        setStoredJSON('linguapaws_level', levelData);
        window.dispatchEvent(new Event('linguapaws-language-changed'));
        // Sync to backend in background
        api.put('/api/settings', { englishLevel: levelData }).catch(() => { });
        setTimeout(() => navigate('/'), 350);
    };

    return (
        <div className="app-container" style={{ minHeight: '100vh', padding: '0', display: 'flex', flexDirection: 'column' }}>
            {/* Progress indicator */}
            <div style={{ padding: '20px 24px 0' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'var(--accent-purple)' }} />
                    <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'var(--accent-purple)' }} />
                </div>

                {/* Paw icon */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    style={{ fontSize: '48px', marginBottom: '16px' }}
                >
                    🐾
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        fontSize: '26px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        lineHeight: '1.3',
                        marginBottom: '8px',
                    }}
                >
                    {question}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}
                >
                    {tr.miko_adjust_level}
                </motion.p>
            </div>

            {/* Level cards */}
            <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {t.levels.map((level, i) => (
                    <motion.button
                        key={level.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.07 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelect(level)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '18px 20px',
                            borderRadius: '20px',
                            border: selected === level.id
                                ? '2px solid var(--accent-purple)'
                                : '2px solid #eee',
                            background: selected === level.id
                                ? 'linear-gradient(135deg, #f5f3ff, #eff6ff)'
                                : 'white',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s',
                            boxShadow: selected === level.id
                                ? '0 4px 16px rgba(139,92,246,0.15)'
                                : '0 2px 8px rgba(0,0,0,0.05)',
                        }}
                    >
                        <span style={{ fontSize: '28px', flexShrink: 0 }}>{level.icon}</span>
                        <div>
                            <div style={{
                                fontSize: '17px',
                                fontWeight: '700',
                                color: selected === level.id ? 'var(--accent-purple)' : 'var(--text-primary)',
                                marginBottom: '3px',
                            }}>
                                {level.label}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {applyTarget(level.sub)}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
