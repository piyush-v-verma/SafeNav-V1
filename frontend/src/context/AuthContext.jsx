import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { useToast } from '../../../shared/toast/ToastProvider';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { warning, success } = useToast();
  const sessionRef = useRef(null);
  const manualSignOutAtRef = useRef(0);

  // Fetch PostgreSQL profile from public.profiles
  const fetchProfile = async (userId, userEmail) => {
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

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      const userProfile = data || {
        id: userId,
        email: userEmail,
        full_name: 'Citizen',
        role: 'user',
        account_status: 'active',
      };
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      console.error('Failed to load user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        sessionRef.current = session;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email);
        }
      })
      .catch(() => {
        sessionRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        const previousSession = sessionRef.current;
        sessionRef.current = currentSession;
        if (event === 'SIGNED_OUT' && previousSession && Date.now() - manualSignOutAtRef.current > 3000) {
          warning('Your session has ended. Sign in again to continue.', { dedupeKey: 'citizen-session-ended' });
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [warning]);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure frontend/.env first.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, { fullName, mobileNumber }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure frontend/.env first.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          mobile_number: mobileNumber,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const resendSignUpVerification = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure frontend/.env first.');
    }
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }
    manualSignOutAtRef.current = Date.now();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      sessionRef.current = null;
      setSession(null);
      setUser(null);
      setProfile(null);
      success('You have been signed out.');
    } catch (error) {
      manualSignOutAtRef.current = 0;
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure frontend/.env first.');
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  const sendPasswordResetOtp = async (emailOrPhone) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    // If it looks like an email:
    if (emailOrPhone.includes('@')) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(emailOrPhone);
      if (error) throw error;
      return data;
    } else {
      // Phone OTP
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: emailOrPhone,
      });
      if (error) throw error;
      return data;
    }
  };

  const verifyOtp = async (emailOrPhone, token) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const isEmail = emailOrPhone.includes('@');
    const { data, error } = await supabase.auth.verifyOtp({
      [isEmail ? 'email' : 'phone']: emailOrPhone,
      token,
      type: isEmail ? 'recovery' : 'sms',
    });
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet.');
    }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  };

  const updateProfile = async ({ fullName, mobileNumber }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        mobile_number: mobileNumber,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isConfigured: isSupabaseConfigured,
    signIn,
    signInWithGoogle,
    signUp,
    resendSignUpVerification,
    signOut,
    resetPassword,
    sendPasswordResetOtp,
    verifyOtp,
    updatePassword,
    updateProfile,
    refreshProfile: () => fetchProfile(user?.id, user?.email),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
