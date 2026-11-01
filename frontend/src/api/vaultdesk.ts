// Every backend endpoint as a small named function. Components never write URLs.
import type {
  Availability,
  Booking,
  CalendarDay,
  Issue,
  IssueInput,
  Location,
  Page,
  Space,
  SpaceInput,
  SummaryCounts,
  Tokens,
  User,
} from "../types";
import { apiFetch } from "./client";

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface SpaceFilters {
  location?: string;
  kind?: string;
  minCapacity?: string;
  includeInactive?: boolean;
}

export interface NewBooking {
  spaceId: number;
  startAt: string;
  endAt: string;
  title: string;
  attendees: number;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<Tokens>("/api/auth/token/", { method: "POST", body: { username, password } }),
  register: (data: RegisterInput) => apiFetch<User>("/api/auth/register/", { method: "POST", body: data }),
  me: (signal?: AbortSignal) => apiFetch<User>("/api/auth/me/", { signal }),
};

export const spacesApi = {
  locations: (signal?: AbortSignal) => apiFetch<Location[]>("/api/locations/", { signal }),
  list: ({ location, kind, minCapacity, includeInactive }: SpaceFilters, signal?: AbortSignal) =>
    apiFetch<Page<Space>>("/api/spaces/", {
      params: { location, kind, min_capacity: minCapacity, include_inactive: includeInactive ? "true" : undefined },
      signal,
    }),
  get: (id: number | string, signal?: AbortSignal) => apiFetch<Space>(`/api/spaces/${id}/`, { signal }),
  // Managers only (the API answers 403 for everyone else).
  create: (room: SpaceInput) => apiFetch<Space>("/api/spaces/", { method: "POST", body: room }),
  update: (id: number, changes: Partial<SpaceInput>) =>
    apiFetch<Space>(`/api/spaces/${id}/`, { method: "PATCH", body: changes }),
  availability: (id: number | string, date: string, signal?: AbortSignal) =>
    apiFetch<Availability>(`/api/spaces/${id}/availability/`, { params: { date }, signal }),
};

export const calendarApi = {
  day: ({ date, location }: { date: string; location?: string }, signal?: AbortSignal) =>
    apiFetch<CalendarDay>("/api/calendar/", { params: { date, location }, signal }),
  summary: (signal?: AbortSignal) => apiFetch<SummaryCounts>("/api/summary/", { signal }),
};

export const bookingsApi = {
  mine: (signal?: AbortSignal) => apiFetch<Page<Booking>>("/api/bookings/", { signal }),
  create: ({ spaceId, startAt, endAt, title, attendees }: NewBooking) =>
    apiFetch<Booking>("/api/bookings/", {
      method: "POST",
      body: { space_id: spaceId, start_at: startAt, end_at: endAt, title, attendees },
    }),
  cancel: (id: number) => apiFetch<Booking>(`/api/bookings/${id}/cancel/`, { method: "POST" }),
};

export const approvalsApi = {
  pending: (signal?: AbortSignal) => apiFetch<Page<Booking>>("/api/approvals/", { signal }),
  approve: (id: number) => apiFetch<Booking>(`/api/bookings/${id}/approve/`, { method: "POST" }),
  reject: (id: number) => apiFetch<Booking>(`/api/bookings/${id}/reject/`, { method: "POST" }),
};

export const maintenanceApi = {
  list: ({ status, location }: { status?: string; location?: string }, signal?: AbortSignal) =>
    apiFetch<Page<Issue>>("/api/issues/", { params: { status, location }, signal }),
  report: (issue: IssueInput) => apiFetch<Issue>("/api/issues/", { method: "POST", body: issue }),
  setStatus: (id: number, status: string) =>
    apiFetch<Issue>(`/api/issues/${id}/status/`, { method: "PATCH", body: { status } }),
};
