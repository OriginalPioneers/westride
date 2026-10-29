import { awardIfSignedIn } from "@/lib/achievements";
import { AchievementCelebration } from "./achievements/achievement-celebration";
import { AppFrame } from "./app-frame";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // An account exists once Clerk has a session. Record First Step on the first
  // signed-in request; later requests leave the existing row in place.
  const userId = await awardIfSignedIn();

  return (
    <AppFrame viewerId={userId}>
      {userId ? <AchievementCelebration /> : null}
      {children}
    </AppFrame>
  );
}
