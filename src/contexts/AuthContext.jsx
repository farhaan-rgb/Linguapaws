import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'linguapaws_token';
const USER_KEY = 'linguapaws_user';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem(USER_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    /**
     * Called after the Google OAuth flow succeeds.
     * Sends the Google credential to the backend, which verifies it,
     * upserts the user in MongoDB, and returns our own JWT.
     */
    const signIn = async (credentialResponse) => {
        try {
            const data = await api.post('/api/auth/google', {
                credential: credentialResponse.credential,
            });
            // data = { token, user }
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));

            // Sync localStorage from DB — DB is the source of truth.
            // Always write OR remove so a server-side reset is honoured on next login.
            if (data.user.nativeLang?.id) {
                localStorage.setItem('linguapaws_native_lang', JSON.stringify(data.user.nativeLang));
            } else {
                localStorage.removeItem('linguapaws_native_lang');
            }
            if (data.user.englishLevel?.id) {
                localStorage.setItem('linguapaws_level', JSON.stringify(data.user.englishLevel));
            } else {
                localStorage.removeItem('linguapaws_level');
            }

            setUser(data.user);
            return data.user;
        } catch (err) {
            console.error('Sign-in failed:', err);
            throw err;
        }
    };

    const signOut = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.clear(); // Wipe all chat sessions — prevents next user seeing previous user's chats
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
