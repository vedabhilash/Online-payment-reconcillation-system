import { useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Shield } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Auth() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to={user.role === 'CUSTOMER' ? '/customer/dashboard' : '/'} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { token, user: userData } = await api.login(email, password, role);
      localStorage.setItem("token", token);
      window.location.href = userData.role === 'CUSTOMER' ? '/customer/dashboard' : '/';
    } catch (err: unknown) {
      toast({ title: "Login failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { token, user: userData } = await api.signup(email, password, role);
      localStorage.setItem("token", token);
      toast({ title: "Account created!", description: "Welcome to ReconPay." });
      window.location.href = userData.role === 'CUSTOMER' ? '/customer/dashboard' : '/';
    } catch (err: unknown) {
      toast({ title: "Sign up failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md space-y-10 z-10">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/20 animate-in fade-in zoom-in duration-700">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">ReconPay</h1>
            <p className="text-lg text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Automated Reconciliation</p>
          </div>
        </div>

        <Card className="glass border-0 shadow-2xl rounded-[2rem] overflow-hidden p-2">
          <Tabs defaultValue="login">
            <CardHeader className="p-6 pb-2">
              <TabsList className="w-full h-12 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
                <TabsTrigger value="login" className="flex-1 rounded-lg font-bold">Log In</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 rounded-lg font-bold">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login" className="p-4 focus-visible:outline-none">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                    <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-3 py-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Type</Label>
                    <RadioGroup value={role} onValueChange={setRole} className="flex gap-6 mt-1 ml-1">
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="ADMIN" id="login-admin" className="border-2 border-primary/20" />
                        <Label htmlFor="login-admin" className="font-semibold cursor-pointer">Admin</Label>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="CUSTOMER" id="login-customer" className="border-2 border-primary/20" />
                        <Label htmlFor="login-customer" className="font-semibold cursor-pointer">Member</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Signing in…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="p-4 focus-visible:outline-none">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Create Password</Label>
                    <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required className="h-12 rounded-xl bg-black/5 dark:bg-white/5 border-0 focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-3 py-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Type</Label>
                    <RadioGroup value={role} onValueChange={setRole} className="flex gap-6 mt-1 ml-1">
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="ADMIN" id="signup-admin" className="border-2 border-primary/20" />
                        <Label htmlFor="signup-admin" className="font-semibold cursor-pointer">Admin</Label>
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <RadioGroupItem value="CUSTOMER" id="signup-customer" className="border-2 border-primary/20" />
                        <Label htmlFor="signup-customer" className="font-semibold cursor-pointer">Member</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button type="submit" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Create Account <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest pt-2">Log in instantly — no confirmation required.</p>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
