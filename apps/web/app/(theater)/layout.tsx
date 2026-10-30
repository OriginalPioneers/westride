import { AppShell } from "@astryxdesign/core/AppShell";

/**
 * Distraction-free frame: no side navigation, Muse dock or footer. Pages in
 * this group provide their own way back to the main app.
 */
export default function TheaterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell variant="surface" mobileNav={false}>
      {children}
    </AppShell>
  );
}
