"use client";

import { use } from "react";
import { NewMeetingForStudent } from "@/components/admin/NewMeetingForStudent";

export default function NewStudentMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NewMeetingForStudent studentId={id} />;
}
