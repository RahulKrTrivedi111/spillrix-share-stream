import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isInitialized: boolean; // <-- Add isInitialized
  signUp: (email: string, password: string, name: string) => Promise<{ error?: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error?: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false); // Start with loading false
  const [isInitialized, setIsInitialized] = useState(false); // Track initialization

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchUserProfile = async (user: User) => {
      console.log('👤 User authenticated, fetching profile...');
      setLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          const defaultRole = user.email === 'linkpointtrivedi480@gmail.com' ? 'admin' : 'artist';
          setProfile({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || 'User',
            role: defaultRole,
            created_at: user.created_at,
          });
        } else {
          setProfile(profileData);
          console.log('✅ Profile fetched successfully:', profileData);
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        setProfile(null); // Clear profile on error
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔄 Auth state change: ${event}`, session?.user?.id ? 'User ID: ' + session.user.id : 'No user');
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          console.log('🚪 No user, clearing profile');
        }
        
        // Mark as initialized after the first auth event
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Clean up any existing auth state first
      await cleanupAuthState();
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: name
          }
        }
      });

      if (error) {
        // Handle specific SMTP/email errors more gracefully
        if (error.message.includes('Error sending confirmation email')) {
          toast({
            title: "Account created with email issue",
            description: "Your account was created but confirmation email couldn't be sent. Try signing in directly or contact support.",
            variant: "default"
          });
          return { error: null }; // Don't treat as complete failure
        }
        
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign in process...');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      console.log('✅ Sign in successful - auth state will update via listener');
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const cleanupAuthState = async () => {
    try {
      // Clear all auth-related storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage too
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout failed, continuing...');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const signOut = async () => {
    try {
      await cleanupAuthState();
      setUser(null);
      setSession(null);
      setProfile(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      // Force page refresh to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isInitialized,
    signUp,
    signIn,
    signOut,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
