"use client";

import { use } from "react";
import { StudentProfile } from "@/components/admin/StudentProfile";

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StudentProfile studentId={id} />;
}
