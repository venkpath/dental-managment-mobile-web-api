/**
 * Read pixel dimensions from a PNG or JPEG buffer without pulling in a
 * native image library. Returns null when the buffer doesn't look like
 * a supported format — callers should treat that as a validation failure.
 *
 * Why parse it ourselves: `sharp` ships platform-specific binaries that are
 * fragile on Windows + CI; `image-size` is fine but adds a dependency for
 * what is fundamentally ~30 lines. We restrict template uploads to PNG/JPEG
 * already, so this covers every format we accept.
 */
export interface ImageDimensions {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;

  // PNG: 8-byte signature, then IHDR chunk starting at byte 8.
  // Width @ 16..19, height @ 20..23 (both BE u32).
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height, format: 'png' };
    return null;
  }

  // JPEG: starts with FF D8. Walk markers until SOFn (0xC0..0xCF except C4/C8/CC).
  // SOF segment layout: FF Cx LEN(2) PRECISION(1) HEIGHT(2) WIDTH(2) ...
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      // Marker prefix
      if (buffer[offset] !== 0xff) return null;
      // Skip 0xFF padding bytes
      while (offset < buffer.length && buffer[offset] === 0xff) offset++;
      const marker = buffer[offset];
      offset++;
      if (marker === undefined) return null;

      // Standalone markers (no segment body)
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }

      const segLen = buffer.readUInt16BE(offset);
      // SOF markers carry the dimensions. Exclude DHT(C4), JPG(C8), DAC(CC).
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        if (width > 0 && height > 0) return { width, height, format: 'jpeg' };
        return null;
      }
      offset += segLen;
    }
    return null;
  }

  return null;
}
