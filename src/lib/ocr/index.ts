/**
 * Browser OCR with tesseract.js (English + Hindi + Marathi). Runs entirely on the device:
 * the image is never uploaded. Language data is fetched once from the tesseract CDN and cached by the browser.
 * OCR output is ALWAYS shown as editable text/fields so a human confirms it.
 */
export type OcrProgress = (pct: number, status: string) => void;

/** Rasterise an image URL or File into a canvas (also handles our SVG samples). */
async function toCanvas(src: string | File): Promise<HTMLCanvasElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
    img.src = url;
  });
  const scale = Math.min(2, 1800 / Math.max(img.naturalWidth || 900, 1));
  const c = document.createElement("canvas");
  c.width = Math.round((img.naturalWidth || 900) * scale);
  c.height = Math.round((img.naturalHeight || 600) * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return c;
}

export async function ocrImage(src: string | File, onProgress?: OcrProgress): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const canvas = await toCanvas(src);
  const worker = await createWorker("eng+hin+mar", 1, {
    logger: (m: { progress: number; status: string }) => onProgress?.(m.progress, m.status),
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export interface ExtractedFields {
  name: string;
  dob: string; // ISO yyyy-mm-dd or ""
  gender: "M" | "F" | "O" | "";
}

/** Best-effort field extraction from OCR text. The UI shows the result as editable inputs. */
export function extractFields(text: string): ExtractedFields {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  let name = "";
  for (const line of lines) {
    const m = line.match(/^(?:name|नाम|नाव|account holder|खातेदार)\s*[:\-–]\s*(.+)$/i);
    if (m) {
      name = m[1].trim();
      break;
    }
  }
  const d = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  const dob = d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : "";
  let gender: ExtractedFields["gender"] = "";
  if (/\b(female|f)\b|महिला|स्त्री/i.test(text)) gender = "F";
  else if (/\b(male|m)\b|पुरुष|पुरूष/i.test(text)) gender = "M";
  return { name, dob, gender };
}
