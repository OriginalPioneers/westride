import { judgeClerkUserId } from "@/lib/judge-access";
import { AppFrame } from "./app-frame";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppFrame judgeUserId={judgeClerkUserId()}>{children}</AppFrame>;
}
