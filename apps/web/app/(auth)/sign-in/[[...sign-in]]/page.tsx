import type { Metadata } from "next";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn
        path={signInPath}
        routing="path"
        signUpUrl={signUpPath}
        fallbackRedirectUrl={afterAuthPath}
      />
    </Suspense>
  );
}
