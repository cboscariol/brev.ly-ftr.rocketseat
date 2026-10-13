import type { Readable } from 'node:stream'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Env } from '../../config/env'

export type UploadInput = {
  key: string
  body: Readable
  contentType: string
  contentDisposition?: string
}

export interface FileStorage {
  upload(input: UploadInput): Promise<{ url: string }>
}

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export function getR2Config(env: Env): R2Config | null {
  const {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_ACCESS_KEY_ID: accessKeyId,
    CLOUDFLARE_SECRET_ACCESS_KEY: secretAccessKey,
    CLOUDFLARE_BUCKET: bucket,
    CLOUDFLARE_PUBLIC_URL: publicUrl,
  } = env

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl }
}

export function buildPublicUrl(publicUrl: string, key: string) {
  const path = key.split('/').map(encodeURIComponent).join('/')
  return `${publicUrl.replace(/\/+$/, '')}/${path}`
}

// Cloudflare R2 via API compatível com S3. O Upload do lib-storage envia o stream em
// partes (multipart), então o arquivo nunca precisa ficar inteiro em memória.
export function createR2Storage(config: R2Config): FileStorage {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // O R2 não implementa todos os checksums que o SDK calcula por padrão.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  return {
    async upload({ key, body, contentType, contentDisposition }) {
      const upload = new Upload({
        client,
        params: {
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentDisposition: contentDisposition,
        },
      })

      await upload.done()

      return { url: buildPublicUrl(config.publicUrl, key) }
    },
  }
}
