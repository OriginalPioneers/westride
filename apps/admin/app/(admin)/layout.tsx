import { redirect } from "next/navigation";
import { getAdminViewer } from "@/lib/admin-auth";
import { signInPath } from "@/lib/paths";
import { AccessDenied } from "./access-denied";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy already requires a session; this is the role check. Server
  // actions repeat it themselves, since a layout only decides what renders.
  const viewer = await getAdminViewer();
  if (!viewer.userId) {
    redirect(signInPath);
  }
  if (!viewer.isAdmin) {
    return <AccessDenied />;
  }
  return <AdminShell>{children}</AdminShell>;
}
