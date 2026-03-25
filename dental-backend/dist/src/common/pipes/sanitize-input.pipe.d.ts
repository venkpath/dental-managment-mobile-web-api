import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class SanitizeInputPipe implements PipeTransform {
    private readonly sanitizeOptions;
    transform(value: unknown, metadata: ArgumentMetadata): unknown;
    private sanitizeValue;
}
