import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAuth = false, requireAdmin = false }: AuthGuardProps) {
  const { user, profile, loading, isAdmin, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isInitialized) return; // Wait for auth to be initialized

    // If auth is required but user is not authenticated
    if (requireAuth && !user) {
      navigate('/auth', { replace: true, state: { from: location } });
      return;
    }

    // If admin access is required but user is not admin
    if (requireAdmin && (!user || !isAdmin)) {
      navigate('/', { replace: true });
      return;
    }

    // Redirect authenticated users from auth page to their dashboard
    if (user && profile && location.pathname === '/auth') {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // Redirect authenticated users from home to their dashboard
    if (user && profile && location.pathname === '/') {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }
  }, [user, profile, isInitialized, isAdmin, navigate, location, requireAuth, requireAdmin]);

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
