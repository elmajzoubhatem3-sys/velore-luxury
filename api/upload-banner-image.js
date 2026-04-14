import { put } from "@vercel/blob";
import { requireAdmin } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const { filename, contentType, dataUrl } = req.body || {};
    if (!filename || !dataUrl) {
      return res.status(400).json({ error: "Missing file data" });
    }

    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: "Invalid data URL" });
    }

    const mime = contentType || matches[1];
    const base64 = matches[2];
    const buffer = Buffer.from(base64, "base64");
    const safeName = filename.replace(/\s+/g, "-").replace(/[^\w.-]/g, "");

    const blob = await put(`banners/${Date.now()}-${safeName}`, buffer, {
      access: "public",
      contentType: mime
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    return res.status(500).json({ error: "Upload failed", details: String(error?.message || error) });
  }
}