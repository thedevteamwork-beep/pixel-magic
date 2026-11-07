// Hand-written copies of the backend response shapes. Dates arrive as ISO strings.

export type ModelKind = "image" | "video";

export type FieldSchema =
  | {
      type: "string";
      description: string;
      enum?: string[];
      default?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      type: "integer";
      description: string;
      minimum: number;
      maximum: number;
      default: number;
    }
  | { type: "boolean"; description: string; default: boolean }
  | {
      type: "image";
      description: string;
      required: boolean;
      maxItems: number;
      supportedContentTypes: string[];
    };

/** One item of `GET /v1/models`. */
export type PublicModel = {
  key: string;
  name: string;
  kind: ModelKind;
  category: string[];
  description: string;
  credits: { min: number; max: number };
  input: Record<string, FieldSchema>;
};

/** `GET /v1/me`, the parts the app uses. */
export type Me = {
  userId: string;
  email: string;
  credits: { available: number };
};

/** `POST /v1/uploads`. */
export type UploadResponse = {
  uploadId: string;
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  expiresAt: string;
};

export type JobStatus =
  "queued" | "submitting" | "submitted" | "finalizing" | "completed" | "failed";

export type JobView = {
  jobId: string;
  status: JobStatus;
  model: string;
  creditCost: number;
  createdAt: string;
  completedAt: string | null;
  /** Signed URLs, only once the job is `completed`. */
  outputs: {
    index: number;
    mimeType: string;
    url?: string;
    expiresAt?: string;
  }[];
  error?: { code: string; message: string };
};

/** `GET /v1/jobs`. */
export type JobList = { jobs: JobView[]; nextCursor: string | null };
