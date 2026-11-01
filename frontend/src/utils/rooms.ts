// Room types, in one place for the filter chips and the room form. Values match Space.Kind in Django.
export const ROOM_TYPES = [
  { value: "meeting_room", label: "Meeting room", plural: "Meeting rooms" },
  { value: "classroom", label: "Classroom", plural: "Classrooms" },
  { value: "auditorium", label: "Auditorium", plural: "Auditoriums" },
  { value: "desk", label: "Hot desk", plural: "Hot desks" },
  { value: "cabin", label: "Private cabin", plural: "Cabins" },
  { value: "quiet_room", label: "Quiet room", plural: "Quiet rooms" },
];

/** "TV, whiteboard ,, Projector" → ["TV", "whiteboard", "Projector"] */
export function parseAmenities(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
