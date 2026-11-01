import { Icon, type IconName } from "./icons";

/**
 * Decorative left panel of the login page: a big curved gradient, floating feature
 * "bubbles", and a small snapshot of the room calendar. Purely visual (aria-hidden).
 * Positions are percentages of the panel; `delay` makes the bubbles float out of step.
 */
interface Bubble {
  icon: IconName;
  tone: string;
  top: string;
  left: string;
  size: number;
  delay: number;
}

const BUBBLES: Bubble[] = [
  { icon: "calendar", tone: "violet", top: "12%", left: "62%", size: 70, delay: 0 },
  { icon: "presentation", tone: "sky", top: "16%", left: "82%", size: 58, delay: 0.8 },
  { icon: "approvals", tone: "amber", top: "84%", left: "12%", size: 62, delay: 1.6 },
  { icon: "wrench", tone: "rose", top: "86%", left: "40%", size: 52, delay: 1.2 },
  { icon: "users", tone: "teal", top: "84%", left: "66%", size: 58, delay: 0.4 },
  { icon: "building", tone: "orange", top: "44%", left: "90%", size: 52, delay: 2 },
];

// Made-up sample day for the snapshot: [start hour, end hour, style] per room, on an 8–20 grid.
type Block = [start: number, end: number, style: "booked" | "pending" | "mine"];

const SAMPLE_ROOMS: { name: string; blocks: Block[] }[] = [
  { name: "Board Room", blocks: [[9, 11, "booked"], [14, 16, "pending"]] },
  { name: "Huddle Room", blocks: [[10, 11.5, "mine"], [13, 14, "booked"]] },
  { name: "Classroom A", blocks: [[8.5, 12, "booked"], [15, 17, "booked"]] },
  { name: "Focus Pod", blocks: [[11, 13, "booked"]] },
];
const GRID_START = 8;
const GRID_HOURS = 12;
const pct = (hour: number) => `${((hour - GRID_START) / GRID_HOURS) * 100}%`;

const MOBILE_STATS = [
  { value: "10", label: "Rooms" },
  { value: "3", label: "In use now" },
  { value: "2", label: "Buildings" },
];

export function LoginArt() {
  return (
    <div className="login-art" aria-hidden="true">
      <div className="login-art__bg" />
      <div className="login-art__glow login-art__glow--1" />
      <div className="login-art__glow login-art__glow--2" />

      <div className="login-art__brand">
        <Icon name="logo" size={30} strokeWidth={2.4} />
        VaultDesk
      </div>

      {BUBBLES.map(({ icon, tone, top, left, size, delay }) => (
        <div
          key={icon}
          className={`login-bubble login-bubble--${tone}`}
          style={{ top, left, width: size, height: size, animationDelay: `${delay}s` }}
        >
          <Icon name={icon} size={Math.round(size * 0.42)} strokeWidth={2.2} />
        </div>
      ))}

      {/* Phones: a short headline and three stat tiles instead of the snapshot. */}
      <div className="login-mobile-hero">
        <div className="login-mobile-hero__title">Every room, one calendar</div>
        <div className="login-mobile-hero__sub">Book desks and meeting rooms in seconds.</div>
        <div className="login-mobile-stats">
          {MOBILE_STATS.map(({ value, label }) => (
            <div key={label} className="login-mobile-stat">
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="login-art__center">
        <div className="snap">
          {/* Main card: a tiny room calendar. */}
          <div className="snap__main">
            <div className="snap__head">
              <div>
                <div className="snap__kicker">Today · Main House</div>
                <div className="snap__kpi">
                  8 bookings <span className="snap__delta">▲ 2 pending</span>
                </div>
              </div>
            </div>
            <div className="snap__grid">
              {SAMPLE_ROOMS.map((room) => (
                <div key={room.name} className="snap__row">
                  <span className="snap__room">{room.name}</span>
                  <span className="snap__track">
                    {room.blocks.map(([start, end, style]) => (
                      <span
                        key={start}
                        className={`snap__block snap__block--${style}`}
                        style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
                      />
                    ))}
                    <span className="snap__now" style={{ left: pct(12.3) }} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Overlapping mini cards. */}
          <div className="snap__mini snap__mini--status">
            <span className="snap__mini-icon">
              <Icon name="check" size={18} strokeWidth={2.6} />
            </span>
            <div>
              <div className="snap__mini-label">Booking confirmed</div>
              <div className="snap__mini-value">Huddle Room · 10:00–11:30</div>
            </div>
          </div>
          <div className="snap__mini snap__mini--free">
            <div>
              <div className="snap__mini-label">Next free</div>
              <div className="snap__mini-big">Focus Pod</div>
            </div>
            <span className="snap__pill">until 4 PM</span>
          </div>
        </div>
        <div className="login-art__headline">Book any room. Keep every space running.</div>
      </div>

      <div className="login-art__footer">© 2026 VaultDesk</div>
    </div>
  );
}
