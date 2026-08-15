import { WorkspaceApp } from "@/src/components/workspace-app";
import { AppErrorBoundary } from "@/src/components/app-error-boundary";

export default function Home() {
  return <AppErrorBoundary><WorkspaceApp /></AppErrorBoundary>;
}
