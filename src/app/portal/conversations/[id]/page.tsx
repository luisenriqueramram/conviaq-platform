// src/app/portal/conversations/[id]/page.tsx
import { redirect } from "next/navigation";

export default async function ConversationByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/conversations?cid=${encodeURIComponent(id)}`);
}
