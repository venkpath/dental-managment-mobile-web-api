export declare class S3Service {
    private readonly logger;
    private readonly client;
    private readonly bucket;
    private readonly expiresIn;
    constructor();
    upload(key: string, body: Buffer, contentType: string): Promise<string>;
    getSignedUrl(key: string, downloadFilename?: string): Promise<string>;
    objectExists(key: string): Promise<boolean>;
    listObjectsByPrefix(prefix: string): Promise<Array<{
        key: string;
        lastModified?: Date;
    }>>;
    delete(key: string): Promise<void>;
    getObject(key: string): Promise<Buffer | null>;
}
