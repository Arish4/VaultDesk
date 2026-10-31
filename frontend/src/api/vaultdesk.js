// Every backend endpoint as a small named function. Components never write URLs.
import { apiFetch } from "./client";

export const authApi = {
  login: (username, password) => apiFetch("/api/auth/token/", { method: "POST", body: { username, password } }),
  register: (data) => apiFetch("/api/auth/register/", { method: "POST", body: data }),
  me: (signal) => apiFetch("/api/auth/me/", { signal }),
};

export const spacesApi = {
  locations: (signal) => apiFetch("/api/locations/", { signal }),
  list: ({ location, kind, minCapacity, includeInactive }, signal) =>
    apiFetch("/api/spaces/", {
      params: { location, kind, min_capacity: minCapacity, include_inactive: includeInactive ? "true" : undefined },
      signal,
    }),
  get: (id, signal) => apiFetch(`/api/spaces/${id}/`, { signal }),
  // Managers only (the API answers 403 for everyone else).
  create: (room) => apiFetch("/api/spaces/", { method: "POST", body: room }),
  update: (id, changes) => apiFetch(`/api/spaces/${id}/`, { method: "PATCH", body: changes }),
  availability: (id, date, signal) => apiFetch(`/api/spaces/${id}/availability/`, { params: { date }, signal }),
};

export const calendarApi = {
  day: ({ date, location }, signal) => apiFetch("/api/calendar/", { params: { date, location }, signal }),
  summary: (signal) => apiFetch("/api/summary/", { signal }),
};

export const bookingsApi = {
  mine: (signal) => apiFetch("/api/bookings/", { signal }),
  create: ({ spaceId, startAt, endAt, title, attendees }) =>
    apiFetch("/api/bookings/", {
      method: "POST",
      body: { space_id: spaceId, start_at: startAt, end_at: endAt, title, attendees },
    }),
  cancel: (id) => apiFetch(`/api/bookings/${id}/cancel/`, { method: "POST" }),
};

export const approvalsApi = {
  pending: (signal) => apiFetch("/api/approvals/", { signal }),
  approve: (id) => apiFetch(`/api/bookings/${id}/approve/`, { method: "POST" }),
  reject: (id) => apiFetch(`/api/bookings/${id}/reject/`, { method: "POST" }),
};

export const maintenanceApi = {
  list: ({ status, location }, signal) => apiFetch("/api/issues/", { params: { status, location }, signal }),
  report: (issue) => apiFetch("/api/issues/", { method: "POST", body: issue }),
  setStatus: (id, status) => apiFetch(`/api/issues/${id}/status/`, { method: "PATCH", body: { status } }),
};
