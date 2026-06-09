export type TimeSlot = {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
};

/**
 * Split time range into smaller slots
 * Example: 06:00 - 18:00 => 2h slots => 06-08, 08-10...
 */
export function splitTimeRange(
    start: string,
    end: string,
    slotMinutes: number
): TimeSlot[] {
    const result: TimeSlot[] = [];

    const startTotal = toMinutes(start);
    const endTotal = toMinutes(end);

    if (startTotal >= endTotal) {
        throw new Error("Invalid time range: start must be < end");
    }

    let current = startTotal;

    while (current < endTotal) {
        const next = Math.min(current + slotMinutes, endTotal);

        result.push({
            start: toTimeString(current),
            end: toTimeString(next),
        });

        current = next;
    }

    return result;
}

/**
 * Convert "HH:mm" → total minutes
 */
export function toMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

/**
 * Convert minutes → "HH:mm"
 */
export function toTimeString(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return `${pad(h)}:${pad(m)}`;
}

/**
 * Pad number to 2 digits
 */
function pad(n: number): string {
    return String(n).padStart(2, "0");
}