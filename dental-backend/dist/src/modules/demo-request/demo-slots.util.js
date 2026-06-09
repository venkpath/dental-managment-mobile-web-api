"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_BLOCKED_SLOTS = exports.DEMO_DAY_END_HOUR = exports.DEMO_DAY_START_HOUR = void 0;
exports.formatSlot = formatSlot;
exports.listDemoSlotTimes = listDemoSlotTimes;
exports.isValidDemoSlot = isValidDemoSlot;
exports.buildSlotLabel = buildSlotLabel;
exports.buildDemoSlotAvailability = buildDemoSlotAvailability;
exports.DEMO_DAY_START_HOUR = 10;
exports.DEMO_DAY_END_HOUR = 22;
exports.DEMO_BLOCKED_SLOTS = new Set(['14:00']);
function formatSlot(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function listDemoSlotTimes() {
    const slots = [];
    for (let hour = exports.DEMO_DAY_START_HOUR; hour < exports.DEMO_DAY_END_HOUR; hour++) {
        for (const minute of [0, 30]) {
            const slot = formatSlot(hour, minute);
            if (!exports.DEMO_BLOCKED_SLOTS.has(slot))
                slots.push(slot);
        }
    }
    return slots;
}
function isValidDemoSlot(slot) {
    return listDemoSlotTimes().includes(slot);
}
function buildSlotLabel(slot) {
    const [h, m] = slot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
function buildDemoSlotAvailability(takenSlots) {
    return listDemoSlotTimes().map((slot) => {
        if (exports.DEMO_BLOCKED_SLOTS.has(slot)) {
            return { slot, label: buildSlotLabel(slot), available: false, reason: 'lunch' };
        }
        if (takenSlots.has(slot)) {
            return { slot, label: buildSlotLabel(slot), available: false, reason: 'booked' };
        }
        return { slot, label: buildSlotLabel(slot), available: true };
    });
}
//# sourceMappingURL=demo-slots.util.js.map