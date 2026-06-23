import { Suspense } from "react";
import AuditView from "./AuditView";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AuditView />
    </Suspense>
  );
}
