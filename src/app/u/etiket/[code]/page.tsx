import { VisitorApp } from "@/components/visitor/VisitorApp";

export default async function TagPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VisitorApp initialCode={code} />;
}
