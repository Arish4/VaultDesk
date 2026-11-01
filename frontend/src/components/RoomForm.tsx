import { useState, type ChangeEvent, type FormEvent } from "react";
import { spacesApi } from "../api/vaultdesk";
import type { Location, Space, SpaceInput } from "../types";
import { readApiError } from "../utils/errors";
import { parseAmenities, ROOM_TYPES } from "../utils/rooms";
import { Button } from "./Button";

/**
 * Add or edit a room (managers only). Pass `room` to edit; leave it out to create.
 * Calls onSaved(room) with the saved room from the API.
 */
interface Props {
  room?: Space;
  locations: Location[];
  defaultLocation?: number;
  onSaved: (room: Space) => void;
}

export function RoomForm({ room, locations, defaultLocation, onSaved }: Props) {
  const isEdit = Boolean(room);
  const [form, setForm] = useState({
    location: String(room?.location.id ?? defaultLocation ?? locations[0]?.id ?? ""),
    name: room?.name ?? "",
    kind: room?.kind ?? "meeting_room",
    capacity: String(room?.capacity ?? 6),
    hourly_price: room?.hourly_price ?? "500.00",
    amenities: (room?.amenities ?? []).join(", "),
    requires_approval: room?.requires_approval ?? false,
    is_active: room?.is_active ?? true,
  });
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const { general, fields } = readApiError(error);

  // One handler factory for every input: checkboxes give `checked`, the rest give `value`.
  const set = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = event.target;
    setForm({ ...form, [field]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload: SpaceInput = {
      ...form,
      location: Number(form.location),
      capacity: Number(form.capacity),
      amenities: parseAmenities(form.amenities),
    };
    try {
      const saved = room ? await spacesApi.update(room.id, payload) : await spacesApi.create(payload);
      onSaved(saved);
    } catch (err) {
      setError(err as Error);
      setSaving(false);
    }
  }

  const fieldError = (name: string) => fields[name] && <span className="field__hint field__hint--error">{fields[name]}</span>;

  return (
    <form className="booking-form" onSubmit={submit}>
      <div className="form-row">
        <label className="field">
          Building
          <select value={form.location} onChange={set("location")} disabled={isEdit}>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Type
          <select value={form.kind} onChange={set("kind")}>
            {ROOM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        Room name
        <input value={form.name} onChange={set("name")} placeholder="e.g. Focus Pod" required maxLength={120} aria-invalid={Boolean(fields.name)} />
        {fieldError("name")}
      </label>

      <div className="form-row">
        <label className="field">
          Seats
          <input type="number" min="1" value={form.capacity} onChange={set("capacity")} required aria-invalid={Boolean(fields.capacity)} />
          {fieldError("capacity")}
        </label>
        <label className="field">
          Price per hour (₹)
          <input type="number" min="0" step="50" value={form.hourly_price} onChange={set("hourly_price")} required aria-invalid={Boolean(fields.hourly_price)} />
          {fieldError("hourly_price")}
        </label>
      </div>

      <label className="field">
        Equipment
        <input value={form.amenities} onChange={set("amenities")} placeholder="TV, Whiteboard, Video call" />
        <span className="field__hint">Separate items with commas.</span>
        {fieldError("amenities")}
      </label>

      <label className="switch">
        <input type="checkbox" checked={form.requires_approval} onChange={set("requires_approval")} />
        <span className="switch__track" aria-hidden="true" />
        <span>
          <strong>Needs manager approval</strong>
          <small>Bookings wait in the Approvals queue until a manager accepts them.</small>
        </span>
      </label>

      {isEdit && (
        <label className="switch">
          <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
          <span className="switch__track" aria-hidden="true" />
          <span>
            <strong>Visible to members</strong>
            <small>Turn off to hide the room (e.g. renovation). Its booking history is kept.</small>
          </span>
        </label>
      )}

      {general && (
        <p className="status status--error" role="alert">
          {general}
        </p>
      )}
      <Button type="submit" loading={saving} disabled={!form.name.trim()}>
        {isEdit ? "Save changes" : "Add room"}
      </Button>
    </form>
  );
}
