import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME ?? '';
    this.expiresIn = parseInt(process.env.S3_SIGNED_URL_EXPIRES ?? '3600', 10);
    const region = process.env.AWS_REGION ?? 'eu-north-1';
    this.client = new S3Client({
      region,
      // Explicitly pin to the regional endpoint — avoids PermanentRedirect
      // when bucket name contains dots (virtual-hosted-style SSL breaks on dotted names)
      endpoint: `https://s3.${region}.amazonaws.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded to S3: ${key}`);
    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: this.expiresIn });
  }

  /** Check whether an object exists at the given key. Returns true on
   *  HeadObject success, false on 404. Used to validate manually-uploaded
   *  S3 keys (e.g. tutorial videos pasted by super-admin). */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (status === 404) return false;
      // 403 usually means missing s3:GetObject/HeadObject in IAM — surface it
      // loudly so admins don't get a misleading "not found" for a file they
      // just uploaded.
      if (status === 403) {
        this.logger.warn(
          `S3 headObject 403 for "${key}" — check IAM policy grants s3:GetObject on this prefix`,
        );
        return false;
      }
      this.logger.warn(`S3 headObject failed for "${key}": ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /** Fetch object bytes — used for embedding small images (e.g. doctor
   *  signatures) directly into generated PDFs. Returns null on any failure
   *  so callers can fall back gracefully. */
  async getObject(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const stream = res.Body as NodeJS.ReadableStream | undefined;
      if (!stream) return null;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      this.logger.warn(`S3 getObject failed for "${key}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}
