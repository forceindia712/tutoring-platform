"use client";

import { useRouter } from "next/navigation";
import { BackLink } from "@/components/ui";
import { MeetingForm } from "@/components/admin/MeetingForm";

export function NewMeeting() {
  const router = useRouter();
  return (
    <div>
      <BackLink href="/admin/dashboard">Panel nauczyciela</BackLink>
      <div className="mt-5">
        <MeetingForm
          onSaved={(meetingId) => {
            router.push(`/admin/meetings/${meetingId}`);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
