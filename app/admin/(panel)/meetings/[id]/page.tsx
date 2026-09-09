"use client";

import { use } from "react";
import { MeetingEditor } from "@/components/admin/MeetingEditor";

export default function MeetingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <MeetingEditor meetingId={id} />;
}
