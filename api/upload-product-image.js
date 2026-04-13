const { put } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { filename, contentType, dataUrl } = body || {};

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

    const safeName = filename.replace(/\s+/g, "-").replace(/[^\w.\-]/g, "");
    const blob = await put(`products/${Date.now()}-${safeName}`, buffer, {
      access: "public",
      contentType: mime
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    return res.status(500).json({
      error: "Upload failed",
      details: String(error && error.message ? error.message : error)
    });
  }
};