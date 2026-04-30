"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readImageDimensions = readImageDimensions;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function readImageDimensions(buffer) {
    if (buffer.length < 24)
        return null;
    if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0)
            return { width, height, format: 'png' };
        return null;
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset < buffer.length - 9) {
            if (buffer[offset] !== 0xff)
                return null;
            while (offset < buffer.length && buffer[offset] === 0xff)
                offset++;
            const marker = buffer[offset];
            offset++;
            if (marker === undefined)
                return null;
            if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
                continue;
            }
            const segLen = buffer.readUInt16BE(offset);
            const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
            if (isSof) {
                const height = buffer.readUInt16BE(offset + 3);
                const width = buffer.readUInt16BE(offset + 5);
                if (width > 0 && height > 0)
                    return { width, height, format: 'jpeg' };
                return null;
            }
            offset += segLen;
        }
        return null;
    }
    return null;
}
//# sourceMappingURL=image-dimensions.util.js.map