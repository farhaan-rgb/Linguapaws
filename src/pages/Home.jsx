import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TopicGrid from '../components/TopicGrid';
import CharacterGrid from '../components/CharacterGrid';
import Stats from '../components/Stats';

export default function Home() {
    const navigate = useNavigate();

    React.useEffect(() => {
        const nativeLang = localStorage.getItem('linguapaws_native_lang');
        if (!nativeLang) {
            navigate('/select-language');
        }
    }, [navigate]);

    const handleStartChat = (topic = null, character = null) => {
        let url = '/chat';
        const params = new URLSearchParams();
        if (topic) {
            params.set('topic', topic.id);
            params.set('name', topic.name);
        }
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
                <Hero onStartChat={() => handleStartChat()} />
                <TopicGrid onSelectTopic={(topic) => handleStartChat(topic)} />
                <CharacterGrid onSelectCharacter={(char) => handleStartChat(null, char)} />
                <Stats />
            </div>
        </div>
    );
}
