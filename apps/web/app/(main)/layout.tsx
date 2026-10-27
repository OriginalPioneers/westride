import { AppFrame } from "./app-frame";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppFrame>{children}</AppFrame>;
}
