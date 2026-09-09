import type { Metadata } from "next";
import { StudentList } from "@/components/admin/StudentList";

export const metadata: Metadata = {
  title: "Uczniowie",
};

export default function StudentsPage() {
  return <StudentList />;
}
