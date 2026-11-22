import { uploadFieldsFor } from "@/lib/video-generator/models";
import type { FrameImage, MotionClip, VideoInputs, VideoMode, VideoModel } from "@/types/video-generator";
import type { RenderUpload } from "./renderVideos";

type Attachment = FrameImage | MotionClip;

/** An attachment's bytes, to upload: attachments are local object URLs or bundled samples. */
async function fileOf(item: Attachment): Promise<File> {
  const blob = await (await fetch(item.url)).blob();
  return new File([blob], item.name || "upload", { type: blob.type || item.mimeType });
}

/**
 * The files a render sends, by the model's upload field: only what the mode
 * and the model use. Attachments uploaded for an earlier take go by their
 * upload id; new ones are read for upload. Throws if a file can't be read.
 */
export async function renderUploads(
  model: VideoModel,
  mode: VideoMode,
  inputs: VideoInputs,
): Promise<Record<string, RenderUpload[]>> {
  const fields = uploadFieldsFor<Attachment>(model, mode, inputs);
  const uploads: Record<string, RenderUpload[]> = {};
  for (const [field, items] of Object.entries(fields)) {
    uploads[field] = await Promise.all(
      items.map(async (item) =>
        item.uploadId ? { key: item.id, uploadId: item.uploadId } : { key: item.id, file: await fileOf(item) },
      ),
    );
  }
  return uploads;
}

/** Upload ids by field, as a stable string: two renders with the same files have the same key. */
export function idsKey(fields: Record<string, readonly string[]>): string {
  return JSON.stringify(
    Object.keys(fields)
      .sort()
      .map((field) => [field, fields[field]]),
  );
}

/** Which files a render sends, by their upload ids (or studio keys before they're uploaded). */
export function uploadsKey(uploads: Record<string, readonly RenderUpload[]>): string {
  return idsKey(
    Object.fromEntries(
      Object.entries(uploads).map(([field, files]) => [field, files.map((file) => file.uploadId ?? file.key)]),
    ),
  );
}

/** Which files the panel's attachments would send now, the same way. */
export function inputsKey(model: VideoModel, mode: VideoMode, inputs: VideoInputs): string {
  return idsKey(
    Object.fromEntries(
      Object.entries(uploadFieldsFor<Attachment>(model, mode, inputs)).map(([field, items]) => [
        field,
        items.map((item) => item.uploadId ?? item.id),
      ]),
    ),
  );
}

/** The attachments with the upload ids a render gave them, so the next take reuses the uploads. */
export function markUploaded(inputs: VideoInputs, uploadIds: Record<string, string>): VideoInputs {
  const mark = <T extends Attachment>(item: T | null): T | null =>
    item && uploadIds[item.id] && item.uploadId !== uploadIds[item.id]
      ? { ...item, uploadId: uploadIds[item.id] }
      : item;
  const references = inputs.references.map((item) => mark(item)!);
  const changed =
    mark(inputs.start) !== inputs.start ||
    mark(inputs.end) !== inputs.end ||
    mark(inputs.clip) !== inputs.clip ||
    references.some((item, index) => item !== inputs.references[index]);
  return changed ? { start: mark(inputs.start), end: mark(inputs.end), clip: mark(inputs.clip), references } : inputs;
}
