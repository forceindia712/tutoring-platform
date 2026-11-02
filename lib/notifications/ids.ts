import type { NotificationAudience, NotificationChannel } from "@/lib/types";

export function notificationStateId(
  meetingId: string,
  channel: NotificationChannel,
  audience: NotificationAudience,
): string {
  return `${meetingId}__${channel}__${audience}`;
}
