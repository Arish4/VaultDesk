// A tiny inline SVG icon set (stroke icons, 24×24). No icon library needed.
const PATHS = {
  logo: "M4 12c3-5 13-5 16 0M7 15c2.5-3 7.5-3 10 0M12 9v9",
  home: "M3 11 12 4l9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  rooms: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bookings: "M6 3h12v18l-6-4-6 4z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  approvals: "M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z",
  building: "M5 21V5l7-2v18M12 7l7 2v12M8 8h1M8 12h1M8 16h1M15 12h1M15 16h1M3 21h18",
  house: "M4 11 12 5l8 6v9H4zM10 20v-5h4v5",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  search: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 14c2 .5 3 2.5 3 5",
  plus: "M12 5v14M5 12h14",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  check: "M5 12l5 5 9-10",
  clock: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  desk: "M3 9h18M5 9v10M19 9v10M8 5h8v4H8z",
  presentation: "M3 4h18M5 4v10h14V4M12 14v3M8 21l4-4 4 4M9 10l2-2 2 2 2-3",
  auditorium: "M4 20V9l8-5 8 5v11M9 20v-5h6v5M8 11h8",
  quiet: "M12 4l7 6v10H5V10zM12 4v4",
  cabin: "M5 21V4h14v17M9 12h2M3 21h18",
  monitor: "M3 5h18v11H3zM8 21h8M12 16v5",
  alert: "M12 3 2 20h20zM12 10v4M12 17v.5",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  sparkle:"M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className = "", title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}

// Which icon to show for each room type coming from the API.
export const KIND_ICON = {
  desk: "desk",
  meeting_room: "monitor",
  classroom: "presentation",
  auditorium: "auditorium",
  quiet_room: "quiet",
  cabin: "cabin",
};
