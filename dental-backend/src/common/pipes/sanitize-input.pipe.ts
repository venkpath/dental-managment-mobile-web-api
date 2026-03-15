import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/**
 * Global pipe that sanitizes all string fields in incoming DTOs
 * to prevent stored XSS attacks. Strips HTML tags and scripts.
 */
@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  };

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Only sanitize body payloads (not params, queries with raw types)
    if (metadata.type !== 'body') return value;
    if (value === null || value === undefined) return value;
    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, this.sanitizeOptions);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeValue(val);
      }
      return sanitized;
    }

    return value;
  }
}
