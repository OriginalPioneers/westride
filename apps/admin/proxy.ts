import { clerkMiddleware } from "@clerk/nextjs/server";
import { signInPath } from "@/lib/paths";

// Everything except the sign-in page needs a Clerk session. Whether that
// session carries the admin role is decided in the admin layout and in every
// server action, where the role can be read.
export default clerkMiddleware(
  async (auth, request) => {
    const { pathname } = request.nextUrl;
    const isSignIn = pathname === signInPath || pathname.startsWith(`${signInPath}/`);
    if (!isSignIn) {
      await auth.protect();
    }
  },
  { signInUrl: signInPath },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
