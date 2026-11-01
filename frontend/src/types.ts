// Shapes of the JSON the Django API returns. Field names match the DRF serializers exactly.

export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Location {
  id: number;
  name: string;
  city: string;
  address: string;
  opens_at: string; // "08:00:00"
  closes_at: string;
}

export type SpaceKind = "desk" | "meeting_room" | "classroom" | "auditorium" | "quiet_room" | "cabin";

export interface Space {
  id: number;
  name: string;
  kind: SpaceKind;
  kind_label: string;
  capacity: number;
  hourly_price: string; // Decimal comes back as a string, e.g. "500.00"
  amenities: string[];
  requires_approval: boolean;
  is_active: boolean;
  location: Location;
}

/** What managers send to create or edit a room. */
export interface SpaceInput {
  location: number;
  name: string;
  kind: string;
  capacity: number;
  hourly_price: string;
  amenities: string[];
  requires_approval: boolean;
  is_active: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export interface Booking {
  id: number;
  space: Space;
  title: string;
  attendees: number;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  status_label: string;
  total_price: string;
  created_at: string;
  requested_by?: string; // only in the approvals queue
}

export interface BookedSlot {
  start_at: string;
  end_at: string;
}

export interface Availability {
  space_id: number;
  date: string;
  opens_at: string;
  closes_at: string;
  booked: BookedSlot[];
}

/** A booking as the calendar grid shows it: no prices, but who booked it. */
export interface CalendarBooking extends BookedSlot {
  id: number;
  title: string;
  status: BookingStatus;
  attendees: number;
  booked_by: string;
  is_mine: boolean;
}

export interface CalendarSpace extends Omit<Space, "location"> {
  out_of_service: boolean;
  bookings: CalendarBooking[];
}

export interface CalendarLocation extends Location {
  spaces: CalendarSpace[];
}

export interface RoomStatus {
  name: string;
  until: string;
}

export interface DayStats {
  rooms_total: number;
  in_use_now: number;
  busy_room: RoomStatus | null;
  bookings_total: number;
  pending: number;
  out_of_service: number;
  next_free: RoomStatus | null;
}

export interface CalendarDay {
  date: string;
  now: string;
  stats: DayStats;
  locations: CalendarLocation[];
}

export interface SummaryCounts {
  my_upcoming: number;
  open_issues: number;
  pending_approvals: number | null; // null for members
}

export type IssueStatus = "open" | "in_progress" | "resolved";
export type IssuePriority = "low" | "medium" | "high";

export interface Issue {
  id: number;
  space: number;
  space_name: string;
  location_name: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  blocks_booking: boolean;
  reported_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface IssueInput {
  space: number;
  title: string;
  description: string;
  priority: string;
  blocks_booking: boolean;
}
