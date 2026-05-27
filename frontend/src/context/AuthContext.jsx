import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const AuthContext = createContext();

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('WARNING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// API URL configuration (relative or pointing to port 5000)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Contains profile details { id, name, email, role, active }
  const [token, setToken] = useState(null); // Supabase JWT access token
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear session data
  const clearSession = async () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem('crm-token');
    await supabase.auth.signOut();
  };

  // Sync user profile from our backend database via Express (secures and checks active state)
  const syncProfile = async (session, throwOnError = false) => {
    if (!session) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const jwtToken = session.access_token;
      setToken(jwtToken);
      localStorage.setItem('crm-token', jwtToken);

      // Verify and fetch profile from Express backend to enforce role validation and active check
      const response = await fetch(`${API_BASE_URL}/leads`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        // If inactive or unauthorized
        const data = await response.json();
        throw new Error(data.error || 'Account deactivated or unauthorized');
      }

      // Fetch the specific user profile from the Express backend
      const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to retrieve user profile');
      }

      const profile = await profileResponse.json();

      setUser(profile);
      setError(null);
    } catch (err) {
      console.error('Session sync error:', err.message);
      setError(err.message);
      setUser(null);
      setToken(null);
      localStorage.removeItem('crm-token');
      await supabase.auth.signOut();
      if (throwOnError) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncProfile(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncProfile(session);
    });

    // Safety timeout: If session recovery hangs, fall back to login screen after 5 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn('Session sync timed out. Falling back to login view.');
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      throw authError;
    }

    await syncProfile(data.session, true);
    return data.user;
  };

  const logout = async () => {
    setLoading(true);
    await clearSession();
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
