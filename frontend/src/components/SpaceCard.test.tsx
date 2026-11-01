import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Space } from "../types";
import { SpaceCard } from "./SpaceCard";

const space: Space = {
  id: 7,
  name: "Auditorium",
  kind: "auditorium",
  kind_label: "Auditorium",
  capacity: 150,
  hourly_price: "5000.00",
  amenities: ["Sound", "Stage"],
  requires_approval: true,
  is_active: true,
  location: { id: 2, name: "Training Center", city: "Bengaluru", address: "", opens_at: "08:00:00", closes_at: "20:00:00" },
};

describe("SpaceCard", () => {
  it("shows the room details from props and links to its page", () => {
    render(
      <MemoryRouter>
        <SpaceCard space={space} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Auditorium", { selector: "h3" })).toBeTruthy();
    expect(screen.getByText("Up to 150 people")).toBeTruthy();
    expect(screen.getByText("Needs approval")).toBeTruthy();
    expect(screen.getByText("Stage")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/rooms/7");
  });

  it("shows free rooms as Free instead of ₹0", () => {
    render(
      <MemoryRouter>
        <SpaceCard space={{ ...space, hourly_price: "0.00", requires_approval: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.queryByText("Needs approval")).toBeNull();
  });
});
