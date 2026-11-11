# Image upscaler

The local preview starts with a focused upload screen and an illustrative, interactive comparison. Model selection and settings appear only after a file passes local image validation. The editor fills the available desktop viewport, with a large image canvas, compact file/download toolbar, and a full-height settings sidebar whose Upscale action stays visible while controls scroll. Smaller screens use a stacked canvas and settings with normal page scrolling. Removing the image returns to the upload screen; replacing it keeps the current settings.

Downloads are fixed PNG. Browser canvas interpolation produces a resized file; model and enhancement controls affect metadata only. It performs **no AI enhancement, sharpening, denoising, or face recovery**. The compact preview disclosure identifies local resizing and explains this limitation. The welcome comparison deliberately softens one copy of an existing photo for illustration; actual uploaded originals are never filtered.

## Settings and model catalog

```ts
type UpscaleSettings = {
  model: "bytedance" | "topaz" | "topaz-generative";
  upscale_factor: 1 | 2 | 4 | 8 | 16;
  preset: string | null;
  sharpness: number | null;
  denoise: number | null;
  face_enhancement: boolean | null;
};
```

| UI model | Enabled preview scales | Advanced settings |
| --- | --- | --- |
| ByteDance Upscale | 2×, 4× | All advanced fields `null` |
| Topaz (default) | 1×, 2×, 4×, 8× | Precision preset, sharpness, denoise, face enhancement |
| Topaz Generative (Premium label) | 1×, 2×, 4× | Generative preset; sharpness/denoise only for Redefine; face control except Wonder 4 |

16× is disabled for all models; also disable unsupported or oversized choices. Defaults: Topaz, 1×, `preset: "Standard V2"` displayed as **Standard**, sharpness 50, denoise 20, face enhancement off. Numeric controls use 0–100; unsupported settings are `null`. Reset restores settings while retaining the file and existing result.

Verified precision preset values are `Standard V2`, `High Fidelity V3`, `High Fidelity V2`, `Low Resolution V2`, `CGI`, `Text Refine`, and `Faces`. [Precision schema](https://fal.ai/models/topaz/upscale/image/precision/api)

Verified generative values: `Wonder 4`, `Wonder 3.5`, `Wonder 3`, `Wonder 2`, `Wonder`, `Recover 3`, `Standard MAX`, `Redefine`, `Recovery V2`, `Recovery`. These API names do not establish Higgsfield's unseen presets. Wonder 4 handles faces automatically. [Generative schema](https://fal.ai/models/topaz/upscale/image/generative/api)

**8× is a preview choice, not guaranteed fal support.** Topaz's [Cloud Apps workflow](https://docs.topazlabs.com/cloud-apps/imageweb-workflows) offers 8×; [fal's precision overview](https://fal.ai/topaz) advertises up to 4×. Future adapters must enforce provider limits independently.

## Local preview contract

`POST /api/demo/image-upscale` accepts metadata only:

```json
{
  "source": {
    "width": 1600,
    "height": 1200,
    "contentType": "image/jpeg",
    "size": 450000
  },
  "model": "topaz",
  "upscale_factor": 1,
  "preset": "Standard V2",
  "sharpness": 50,
  "denoise": 20,
  "face_enhancement": false
}
```

The request is `{ source, ...settings }`; reject `output_format`. Return `{ demo: true, creditsCharged: 0, settings, output }`, echoing validated settings. Output contains `width`, `height`, `contentType: "image/png"`, `format: "png"`. Source pixels, file bytes, URLs, and data URIs stay in the browser. The endpoint returns metadata without calling provider, authentication, persistence, or credit services.

Validate exact keys, PNG/JPEG/WebP metadata, integer dimensions/size, model-specific factors/presets, numeric bounds, nullability, and calculated output. Decode locally; verify the PNG blob, revoke replaced URLs, ignore stale work, and preserve completed results' settings snapshots.

These are **local implementation caps, not provider limits**:

| Constraint | Input | Output |
| --- | --- | --- |
| File size | Up to 20 MiB (`20 × 1024²` bytes) | Determined by browser encoding |
| Longest edge | Up to 8,192px | Up to 8,192px |
| Pixel count | Up to 33,554,432 (`32 × 1024²`) | Up to 33,554,432 |

Check output caps before allocating canvas. Share client/server limits. Test compatibility, boundaries, fixed PNG, settings echoes, zero credits, and metadata-only requests.

## Planned fal integration

There is no live provider integration or provider-payload module yet. Future server adapters should dispatch by application `model`:

- `bytedance`: [SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/image/api), endpoint `fal-ai/seedvr/upscale/image`; send uploaded `image_url`, `upscale_mode: "factor"`, supported factor, and `output_format: "png"`. Omit the unsupported enhancement controls. Its response schema requires `image` and integer `seed`, although its example omits `seed`.
- `topaz`: `topaz/upscale/image/precision`; map `preset` to provider `model`, `sharpness / 100` to `sharpen`, `denoise / 100` to `denoise`, and the face boolean to `face_enhancement`; send factor and PNG format.
- `topaz-generative`: `topaz/upscale/image/generative`; map the preset similarly, but send sharpening/denoising only for `Redefine`. Omit unsupported controls, including the face toggle for `Wonder 4`.

These mappings are future work. Validate `image.url`, actual file type, and decoded dimensions; provider responses may omit width/height.

Future flow: authorize → signed upload → queue submission → poll or verified webhook → validated output. Keep `FAL_KEY` server-only, retain request IDs, enforce HTTPS/decoded-dimension limits, and implement billing separately before enabling real AI.

The [queue guide](https://fal.ai/docs/documentation/model-apis/inference/queue) defines `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`. Check completion errors and use returned lifecycle URLs. Browser abort only stops local waiting; request provider cancellation explicitly. In-progress cancellation may still complete.

## BytePlus alternative

[ImageAIProcess](https://docs.byteplus.com/en/docs/byteplus-vod/reference-imageaiprocess) requires uploaded `Pid`, `ProcessType: "AISuperResolution"`, and JSON-string `WorkflowParameter` containing `GenDREnhanceParam.Multiple`. It retains input format and accepts no output-format parameter. Validate its separate [enhancement limits](https://docs.byteplus.com/en/docs/byteplus-vod/docs-image-enhancement).

Poll [GetImageProcessTasks](https://docs.byteplus.com/en/docs/byteplus-vod/reference-getimageprocesstasks) with `SpaceName`, `Pid`, `TaskId`; output has metadata, not a URL. Resolve the processed file through [GetImageInfos](https://docs.byteplus.com/en/docs/byteplus-vod/reference-getimageinfos), requesting HTTPS; missing playback domains produce empty URLs. Fixed PNG output requires separate conversion. This VOD contract is not interchangeable with fal.
