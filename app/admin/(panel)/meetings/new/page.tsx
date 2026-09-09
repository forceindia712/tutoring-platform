import type { Metadata } from "next";
import { NewMeeting } from "@/components/admin/NewMeeting";

export const metadata: Metadata = {
  title: "Nowe spotkanie",
};

export default function NewMeetingPage() {
  return <NewMeeting />;
}
