"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

const providers = [
  {
    id: "google",
    label: "Continue with Google",
    icon: <FcGoogle className="w-5 h-5" />,
  },
  {
    id: "apple",
    label: "Continue with Apple",
    icon: <SiApple className="w-5 h-5" />,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!result || !result.ok) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with email + password or continue with a provider.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={handleCredentialsLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-gradient-magenta" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {providers.map((provider) => (
              <Button
                key={provider.id}
                className="w-full bg-gradient-magenta"
                variant="default"
                onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
              >
                <span className="mr-2 inline-flex items-center justify-center">
                  {provider.icon}
                </span>
                {provider.label}
              </Button>
            ))}
            <Separator />
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to share your basic profile info with TicketCue.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account? {" "}
              <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
