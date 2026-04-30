export interface ImageDimensions {
    width: number;
    height: number;
    format: 'png' | 'jpeg';
}
export declare function readImageDimensions(buffer: Buffer): ImageDimensions | null;
