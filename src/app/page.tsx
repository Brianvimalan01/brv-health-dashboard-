import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard-view";

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
