import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z.string().optional(),
});

import { usePerformance } from '@/hooks/use-performance';

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const { isSlowConnection } = usePerformance();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast({
            title: 'Sign In Failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        const { error } = await signUp(data.email, data.password, data.name);
        if (error) {
          toast({
            title: 'Sign Up Failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          setIsLogin(true);
          toast({
            title: 'Sign Up Successful',
            description: 'Please check your email to verify your account.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className={`min-h-screen ${isSlowConnection ? '' : 'hero-gradient'}`}>
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
          <div className="mobile-container py-4 flex items-center">
            <Logo size="md" />
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
                  <div className="password-warning">
                  <span className="warning-icon">⚠️</span>
                  <span className="message">NOTE :- Save Your Password Now!</span>
                </div>
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
                     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                       {!isLogin && (
                         <div className="space-y-2">
                           <Label htmlFor="name">Full Name</Label>
                           <Input
                             id="name"
                             type="text"
                             placeholder="Enter your full name"
                             {...register('name')}
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
                           {...register('email')}
                           required
                           className="input-modern"
                         />
                         {errors.email && (
                           <p className="text-sm text-destructive">{errors.email.message}</p>
                         )}
                       </div>
                       
                       <div className="space-y-2">
                         <div className="flex items-center justify-between">
                           <Label htmlFor="password">Password</Label>
                         </div>
                         <Input
                           id="password"
                           type="password"
                           placeholder="Enter your password"
                           {...register('password')}
                           required
                           className="input-modern"
                         />
                         {errors.password && (
                           <p className="text-sm text-destructive">{errors.password.message}</p>
                         )}
                       </div>

                       <Button
                         type="submit"
                         className="w-full btn-primary touch-target"
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
                         }}
                         className="text-primary hover:text-primary/80 w-full mt-2"
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
