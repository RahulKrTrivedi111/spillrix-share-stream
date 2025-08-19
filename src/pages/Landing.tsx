import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Music, Upload, Users, Shield } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (!error) {
          // Navigation is handled by AuthGuard
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (!error) {
          setIsLogin(true);
          setPassword('');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen hero-gradient">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
          <div className="container mx-auto px-4 py-4">
            <Logo size="md" />
          </div>
        </header>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Left Side - Hero Content */}
              <div className="space-y-8 smooth-enter">
                <div className="space-y-4">
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      Spillrix
                    </span>
                    <br />
                    <span className="text-foreground">Distribution</span>
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-lg">
                    Free music sharing for artists & listeners worldwide. 
                    Upload, discover, and share amazing music with the community.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Easy Upload</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Global Reach</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                    <Music className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">High Quality</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Secure</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Auth Form */}
              <div className="flex justify-center lg:justify-end">
                <Card className="w-full max-w-md glass-card">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">
                      {isLogin ? 'Welcome Back' : 'Join Spillrix'}
                    </CardTitle>
                    <CardDescription>
                      {isLogin 
                        ? 'Sign in to your account to continue' 
                        : 'Create your account to start sharing music'
                      }
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {!isLogin && (
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required={!isLogin}
                            className="input-modern"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="input-modern"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="input-modern"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full btn-primary" 
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {isLogin ? 'Signing In...' : 'Creating Account...'}
                          </>
                        ) : (
                          isLogin ? 'Sign In' : 'Create Account'
                        )}
                      </Button>
                    </form>
                    
                    <div className="mt-6 text-center">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setPassword('');
                        }}
                        className="text-primary hover:text-primary/80"
                      >
                        {isLogin 
                          ? "Don't have an account? Sign up" 
                          : 'Already have an account? Sign in'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}