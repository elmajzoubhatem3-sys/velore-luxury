export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const order = req.body;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: "New Order VELORE",
        html: `
          <h2>New Order</h2>
          <p>Name: ${order.name}</p>
          <p>Phone: ${order.phone}</p>
          <p>Address: ${order.address}</p>
          <p>Items:<br>${order.items}</p>
          <p>Total: ${order.total}$</p>
        `
      })
    });

    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: true });
  }
}