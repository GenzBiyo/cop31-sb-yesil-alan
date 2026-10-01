"use client";

import { SessionDesk } from "@/components/SessionDesk";
import { PanelScreenControl } from "@/components/PanelScreenControl";

export default function PanelsPage() {
  return (
    <div className="space-y-4">
      <PanelScreenControl />
      <SessionDesk mode="panel" />
    </div>
  );
}
