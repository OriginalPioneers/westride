import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { afterAuthPath, signInPath, signUpPath } from "@/lib/auth-paths";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUp
        path={signUpPath}
        routing="path"
        signInUrl={signInPath}
        fallbackRedirectUrl={afterAuthPath}
      />
    </Suspense>
  );
}
