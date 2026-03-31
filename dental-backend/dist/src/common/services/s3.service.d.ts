export declare class S3Service {
    private readonly logger;
    private readonly client;
    private readonly bucket;
    private readonly expiresIn;
    constructor();
    upload(key: string, body: Buffer, contentType: string): Promise<string>;
    getSignedUrl(key: string): Promise<string>;
}
