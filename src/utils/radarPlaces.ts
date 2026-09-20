export type RadarPlaceGroup = 'all' | 'shop' | 'transport' | 'faith' | 'community';

export const RADAR_RESULT_LIMIT = 20;

export const RADAR_PLACE_GROUPS: Array<{ id: RadarPlaceGroup; label: string; emoji: string }> = [
  { id: 'all', label: 'ทุกหมวด', emoji: '🌐' },
  { id: 'shop', label: 'ร้านค้าและบริการ', emoji: '🏪' },
  { id: 'transport', label: 'ขนส่งสาธารณะ', emoji: '🚉' },
  { id: 'faith', label: 'ศาสนสถาน', emoji: '🙏' },
  { id: 'community', label: 'ชุมชนและสถานที่สำคัญ', emoji: '🏫' },
];

/**
 * Selects at most 20 nearby places. A selected group receives its closest 20;
 * the default "all" mode uses round-robin selection so every available group
 * is represented before a group receives its next slot.
 */
export function selectRadarPlaces<T extends { placeGroup?: string; distanceMeters: number }>(
  places: T[],
  group: RadarPlaceGroup,
  limit = RADAR_RESULT_LIMIT,
): T[] {
  const sorted = [...places].sort((a, b) => a.distanceMeters - b.distanceMeters);
  if (group !== 'all') return sorted.filter((place) => place.placeGroup === group).slice(0, limit);

  const groupOrder = RADAR_PLACE_GROUPS.filter((item) => item.id !== 'all').map((item) => item.id);
  const queues = new Map(groupOrder.map((id) => [id, sorted.filter((place) => place.placeGroup === id)]));
  const selected: T[] = [];
  let round = 0;
  while (selected.length < limit) {
    let added = false;
    for (const id of groupOrder) {
      const candidate = queues.get(id)?.[round];
      if (!candidate) continue;
      selected.push(candidate);
      added = true;
      if (selected.length === limit) break;
    }
    if (!added) break;
    round += 1;
  }
  return selected;
}
