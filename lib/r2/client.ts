import "server-only";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { listAllKeys, type CatalogStore } from "./catalog";

export function createR2Store(
  env: Record<string, string | undefined>,
): CatalogStore {
  const accountId = env.R2_ACCOUNT_ID ?? "";
  const bucket = env.R2_BUCKET_NAME ?? "";
  const expiresIn = Number(env.R2_SIGN_EXPIRES_SECONDS) || 3600;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  return {
    async listKeys(prefix: string) {
      return listAllKeys(async (continuationToken) => {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        return {
          contents: response.Contents,
          nextContinuationToken: response.NextContinuationToken,
        };
      });
    },
    async signUrl(key: string) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },
  };
}
