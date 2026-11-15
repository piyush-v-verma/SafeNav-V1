import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const verifyAdminRole = async (userId, userEmail) => {
    if (!isSupabaseConfigured || !userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching admin profile:', error);
        setAuthError('Could not verify administrator privileges.');
        return null;
      }

      if (!data || data.role !== 'admin') {
        // Deny access to citizens
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        setAuthError('Access Denied: This account does not possess administrative privileges.');
        return null;
      }

      if (data.account_status !== 'active') {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        setAuthError('Access Denied: Administrator account is suspended.');
        return null;
      }

      const adminProfile = { ...data, email: userEmail };
      setProfile(adminProfile);
      setAuthError(null);
      return adminProfile;
    } catch (err) {
      console.error('Failed to verify admin status:', err);
      setAuthError('Failed to communicate with authentication service.');
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        verifyAdminRole(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await verifyAdminRole(currentSession.user.id, currentSession.user.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured in admin-frontend/.env.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const verified = await verifyAdminRole(data.user.id, data.user.email);
    if (!verified) {
      throw new Error('Access Denied: Account lacks administrator privileges.');
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    signIn,
    signOut,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
