"use client";

import { PosterStudio, type StudioPanel, type StudioSpeaker } from "@/components/posters/PosterStudio";
import { useApi } from "@/lib/client";

export default function PosterPage() {
  const panels = useApi<{ panels: StudioPanel[] }>("/api/panels");
  const speakers = useApi<{ speakers: StudioSpeaker[] }>("/api/speakers");
  return <PosterStudio panels={panels.data?.panels || []} speakers={speakers.data?.speakers || []} />;
}
