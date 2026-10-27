import { awardIfSignedIn } from "@/lib/achievements";
import { AppFrame } from "./app-frame";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // An account exists once Clerk has a session. Record Newbie on the first
  // signed-in request; later requests leave the existing row in place.
  await awardIfSignedIn();

  return <AppFrame>{children}</AppFrame>;
}
