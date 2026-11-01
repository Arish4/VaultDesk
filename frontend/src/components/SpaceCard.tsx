import { Link } from "react-router-dom";
import type { Space } from "../types";
import { formatPrice } from "../utils/time";
import { Icon, KIND_ICON } from "./icons";

// Presentational component: it only renders the props it gets. No fetching, no state.
export function SpaceCard({ space }: { space: Space }) {
  return (
    <Link to={`/rooms/${space.id}`} className="room-card">
      <div className="room-card__top">
        <span className="room-icon room-icon--lg">
          <Icon name={KIND_ICON[space.kind] ?? "rooms"} size={24} />
        </span>
        <span className="room-card__pills">
          {!space.is_active && <span className="pill pill--cancelled">Hidden</span>}
          {space.requires_approval && <span className="pill pill--pending">Needs approval</span>}
        </span>
      </div>
      <h3>{space.name}</h3>
      <p className="muted">
        {space.kind_label} · {space.location.name}
      </p>
      <div className="room-card__amenities">
        {space.amenities.map((amenity) => (
          <span key={amenity} className="tag">
            {amenity}
          </span>
        ))}
      </div>
      <div className="room-card__meta">
        <span>
          <Icon name="users" size={16} /> {space.capacity === 1 ? "1 person" : `Up to ${space.capacity} people`}
        </span>
        <strong>{Number(space.hourly_price) === 0 ? "Free" : `${formatPrice(space.hourly_price)}/hr`}</strong>
      </div>
    </Link>
  );
}
