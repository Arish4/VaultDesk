import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../api/vaultdesk", () => ({ spacesApi: { create: vi.fn(), update: vi.fn() } }));

import { spacesApi } from "../api/vaultdesk";
import { ApiError } from "../api/client";
import type { Location, Space } from "../types";
import { RoomForm } from "./RoomForm";

const create = spacesApi.create as Mock;
const update = spacesApi.update as Mock;

const hours = { city: "Bengaluru", address: "", opens_at: "08:00:00", closes_at: "20:00:00" };
const locations: Location[] = [
  { id: 1, name: "Main House", ...hours },
  { id: 2, name: "Training Center", ...hours },
];

beforeEach(() => vi.clearAllMocks());

describe("RoomForm", () => {
  it("creates a room with cleaned-up equipment and the approval switch", async () => {
    create.mockResolvedValue({ id: 9, name: "Focus Pod" });
    const onSaved = vi.fn();
    render(<RoomForm locations={locations} defaultLocation={2} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Focus Pod" } });
    fireEvent.change(screen.getByLabelText(/Equipment/), { target: { value: "TV, , Whiteboard " } });
    fireEvent.click(screen.getByLabelText(/Needs manager approval/));
    fireEvent.click(screen.getByRole("button", { name: "Add room" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 9, name: "Focus Pod" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      location: 2, name: "Focus Pod", amenities: ["TV", "Whiteboard"], requires_approval: true,
    }));
  });

  it("shows the API's message under the right field", async () => {
    create.mockRejectedValue(new ApiError(400, { name: ["Main House already has a room called “Desk 1”."] }));
    render(<RoomForm locations={locations} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Room name"), { target: { value: "Desk 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add room" }));

    expect(await screen.findByText(/already has a room called/)).toBeTruthy();
  });

  it("edits an existing room and can hide it", async () => {
    const room: Space = {
      id: 4, name: "Huddle Room", kind: "meeting_room", kind_label: "Meeting room", capacity: 4, hourly_price: "600.00",
      amenities: ["TV"], requires_approval: false, is_active: true, location: locations[0],
    };
    update.mockResolvedValue({ ...room, is_active: false });
    render(<RoomForm room={room} locations={locations} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByLabelText(/Visible to members/));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(4, expect.objectContaining({ is_active: false })));
  });
});
