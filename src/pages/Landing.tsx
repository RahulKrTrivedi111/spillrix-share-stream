import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Music, Upload, Users, Shield, ArrowLeft } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) {
          toast({
            title: "Reset failed",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Reset email sent!",
            description: "Check your email for password reset instructions.",
          });
          setIsForgotPassword(false);
          setIsLogin(true);
        }
      } else if (isLogin) {
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
          <div className="mobile-container py-4 flex items-center">
            <Logo size="md" />
            <span className="text-lg font-semibold ml-2">Spillrix Distribution</span>
          </div>
        </header>

        {/* Hero Section */}
        <div className="mobile-container py-8 md:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="mobile-stack items-center text-center lg:text-left lg:grid lg:grid-cols-2 lg:gap-12">
              
              {/* Left Side - Hero Content */}
              <div className="space-y-8 smooth-enter">
                <div className="space-y-4">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      Spillrix
                    </span>
                    <br />
                    <span className="text-foreground">Distribution</span>
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                    Free music sharing for artists & listeners worldwide. 
                    Upload, discover, and share amazing music with the community.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="mobile-grid">
                  <div className="mobile-card touch-target flex items-center justify-center flex-col">
                    <Upload className="h-6 w-6 text-primary mb-2" />
                    <span className="mobile-text font-medium">Easy Upload</span>
                  </div>
                  <div className="mobile-card touch-target flex items-center justify-center flex-col">
                    <Users className="h-6 w-6 text-primary mb-2" />
                    <span className="mobile-text font-medium">Global Reach</span>
                  </div>
                  <div className="mobile-card touch-target flex items-center justify-center flex-col">
                    <Music className="h-6 w-6 text-primary mb-2" />
                    <span className="mobile-text font-medium">High Quality</span>
                  </div>
                  <div className="mobile-card touch-target flex items-center justify-center flex-col">
                    <Shield className="h-6 w-6 text-primary mb-2" />
                    <span className="mobile-text font-medium">Secure</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Auth Form */}
              <div className="flex justify-center lg:justify-end w-full">
                <Card className="w-full max-w-md glass-card">
                   <CardHeader className="text-center">
                     <CardTitle className="text-2xl">
                       {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join Spillrix'}
                     </CardTitle>
                     <CardDescription>
                       {isForgotPassword 
                         ? 'Enter your email to receive reset instructions'
                         : isLogin 
                         ? 'Sign in to your account to continue' 
                         : 'Create your account to start sharing music'
                       }
                     </CardDescription>
                   </CardHeader>
                  
                   <CardContent>
                     <form onSubmit={handleSubmit} className="space-y-6">
                       {!isLogin && !isForgotPassword && (
                         <div className="space-y-2">
                           <Label htmlFor="name">Full Name</Label>
                           <Input
                             id="name"
                             type="text"
                             placeholder="Enter your full name"
                             value={name}
                             onChange={(e) => setName(e.target.value)}
                             required={!isLogin && !isForgotPassword}
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
                       
                       {!isForgotPassword && (
                         <div className="space-y-2">
                           <div className="flex items-center justify-between">
                             <Label htmlFor="password">Password</Label>
                             {isLogin && (
                               <Button
                                 type="button"
                                 variant="link"
                                 size="sm"
                                 onClick={() => setIsForgotPassword(true)}
                                 className="text-primary hover:text-primary/80 p-0"
                               >
                                 Forgot password?
                               </Button>
                             )}
                           </div>
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
                       )}

                       <Button
                         type="submit"
                         className="w-full btn-primary touch-target"
                         size="lg"
                         disabled={loading}
                       >
                         {loading ? (
                           <>
                             <Loader2 className="h-4 w-4 animate-spin mr-2" />
                             {isForgotPassword ? 'Sending Reset Email...' : isLogin ? 'Signing In...' : 'Creating Account...'}
                           </>
                         ) : (
                           isForgotPassword ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Create Account'
                         )}
                       </Button>
                     </form>
                     
                     <div className="mt-6 text-center">
                       {isForgotPassword ? (
                         <Button
                           variant="ghost"
                           onClick={() => {
                             setIsForgotPassword(false);
                             setIsLogin(true);
                           }}
                           className="text-primary hover:text-primary/80 w-full mt-2"
                         >
                           <ArrowLeft className="h-4 w-4 mr-2" />
                           Back to Sign In
                         </Button>
                       ) : (
                         <Button
                           variant="ghost"
                           onClick={() => {
                             setIsLogin(!isLogin);
                             setPassword('');
                           }}
                           className="text-primary hover:text-primary/80 w-full mt-2"
                         >
                           {isLogin 
                             ? "Don't have an account? Sign up" 
                             : 'Already have an account? Sign in'
                           }
                         </Button>
                       )}
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
