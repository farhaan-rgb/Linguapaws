import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TopicGrid from '../components/TopicGrid';
import CharacterGrid from '../components/CharacterGrid';
import Stats from '../components/Stats';
import ModeToggle from '../components/ModeToggle';
import { getLearnMode, setLearnMode } from '../utils/learnMode';

export default function Home() {
    const navigate = useNavigate();
    const [learnMode, setMode] = React.useState(getLearnMode);

    React.useEffect(() => {
        const nativeLang = localStorage.getItem('linguapaws_native_lang');
        const targetLang = localStorage.getItem('linguapaws_target_lang');
        const level = localStorage.getItem('linguapaws_level');
        if (!nativeLang) {
            navigate('/select-language');
            return;
        }
        if (!targetLang) {
            navigate('/learn-language');
            return;
        }
        if (!level) {
            navigate('/level-select');
        }
    }, [navigate]);

    const handleChangeMode = (mode) => {
        setLearnMode(mode);
        setMode(mode);
    };

    const handleStartChat = (topic = null, character = null) => {
        // Step mode has no tutor persona, so picking a character always means chat.
        const url = (learnMode === 'steps' && !character) ? '/steps' : '/chat';
        const params = new URLSearchParams();
        if (topic) {
            params.set('scenario', topic.id);
        }
        // No topic picked: /steps resolves the learner's current lesson itself,
        // from the same progress counter the chat advances.
        if (character) {
            localStorage.setItem('linguapaws_active_character', JSON.stringify(character));
        } else {
            localStorage.removeItem('linguapaws_active_character');
        }

        const queryString = params.toString();
        navigate(queryString ? `${url}?${queryString}` : url);
    };

    return (
        <div className="app-container" style={{ padding: '8px 16px' }}>
            <Header />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ModeToggle mode={learnMode} onChange={handleChangeMode} />
                <Hero onStartChat={() => handleStartChat()} />
                <TopicGrid onSelectTopic={(topic) => handleStartChat(topic)} />
                <CharacterGrid onSelectCharacter={(char) => handleStartChat(null, char)} />
                <Stats />
            </div>
        </div>
    );
}
