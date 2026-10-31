import { ROOM_TYPES } from "../utils/rooms";

const KINDS = [{ value: "", label: "All types" }, ...ROOM_TYPES.map((t) => ({ value: t.value, label: t.plural }))];

// Controlled component: the parent owns the filter state; this only reports changes up.
export function FilterBar({ filters, onChange }) {
  const update = (field, value) => onChange({ ...filters, [field]: value });

  return (
    <div className="filters">
      <div className="chips" role="group" aria-label="Room type">
        {KINDS.map((kind) => (
          <button
            key={kind.value}
            className={`chip ${filters.kind === kind.value ? "chip--active" : ""}`}
            onClick={() => update("kind", kind.value)}
          >
            {kind.label}
          </button>
        ))}
      </div>
      <label className="inline-field">
        People
        <input
          type="number"
          min="1"
          placeholder="Any"
          value={filters.minCapacity}
          onChange={(event) => update("minCapacity", event.target.value)}
        />
      </label>
    </div>
  );
}
