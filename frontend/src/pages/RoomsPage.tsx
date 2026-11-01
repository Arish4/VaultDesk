import { useState } from "react";
import { spacesApi } from "../api/vaultdesk";
import { Button } from "../components/Button";
import { FilterBar, type RoomFilters } from "../components/FilterBar";
import { Icon } from "../components/icons";
import { Modal } from "../components/Modal";
import { RoomForm } from "../components/RoomForm";
import { SpaceCard } from "../components/SpaceCard";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";
import { useBuilding } from "../hooks/useBuilding";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import type { Space } from "../types";

const NO_FILTERS: RoomFilters = { kind: "", minCapacity: "" };

export default function RoomsPage() {
  const search = useUiStore((state) => state.search);
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const [building] = useBuilding();
  const [filters, setFilters] = useState(NO_FILTERS);
  const [showHidden, setShowHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const locations = useApi((signal) => spacesApi.locations(signal), []);
  // Re-fetches automatically whenever the building, a filter or "show hidden" changes.
  const spaces = useApi(
    (signal) => spacesApi.list({ location: building, ...filters, includeInactive: isStaff && showHidden }, signal),
    [building, filters.kind, filters.minCapacity, isStaff, showHidden],
  );

  const term = search.trim().toLowerCase();
  const results = (spaces.data?.results ?? []).filter((space) => !term || space.name.toLowerCase().includes(term));

  function roomAdded(room: Space) {
    setAdding(false);
    setNotice(`${room.name} was added. Everyone can see and book it now${room.requires_approval ? " (with your approval)" : ""}.`);
    spaces.reload();
  }

  return (
    <div className="page-wide">
      <header className="page-header">
        <div>
          <h2 className="page-title">Meeting rooms</h2>
          <p className="muted">Find the right room, check its day and book it.</p>
        </div>
        {isStaff && (
          <div className="header-actions">
            <button className={`chip ${showHidden ? "chip--active" : ""}`} onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? "Showing hidden rooms" : "Show hidden rooms"}
            </button>
            <Button onClick={() => setAdding(true)} disabled={!locations.data}>
              <Icon name="plus" size={18} /> Add room
            </Button>
          </div>
        )}
      </header>

      {notice && (
        <p className="status status--success" role="status">
          {notice}
        </p>
      )}

      <FilterBar filters={filters} onChange={setFilters} />

      {spaces.loading && !spaces.data && <Loading />}
      <ErrorMessage error={spaces.error} onRetry={spaces.reload} />
      {spaces.data && results.length === 0 && (
        <EmptyState title="No rooms match.">
          <button className="link-button" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </button>
        </EmptyState>
      )}

      <div className="grid">
        {results.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>

      {adding && (
        <Modal title="Add a room" subtitle="It appears for every member as soon as you save." onClose={() => setAdding(false)}>
          <RoomForm locations={locations.data ?? []} defaultLocation={building ? Number(building) : undefined} onSaved={roomAdded} />
        </Modal>
      )}
    </div>
  );
}
