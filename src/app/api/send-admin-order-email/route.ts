import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.WEB_ORDER_EMAIL!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      riderCode,
      customerName,
      customerPhone,
      address,
      subtotal,
      deliveryFee,
      serviceCharge,
      total,
      paymentMethod,
      deliveryTime,
      deliveryDistance,
      deliveryDuration,
      items,
      restaurantName,
    } = await request.json();

    const itemRowsHtml = items
      .map(
        (item: any) => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
          <span style="font-size:14px;font-weight:600;color:#111827;display:block;">${item.name}</span>
          ${item.size ? `<span style="display:inline-block;margin-top:4px;padding:2px 8px;background:#fff7ed;color:#ea580c;border-radius:4px;font-size:11px;font-weight:600;">${item.size}</span>` : ""}
          ${item.extras?.length ? `<span style="display:block;margin-top:4px;font-size:12px;color:#9ca3af;">+ ${item.extras.join(", ")}</span>` : ""}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:top;">
          <span style="display:inline-block;padding:2px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:20px;font-size:13px;color:#374151;font-weight:600;">×${item.quantity}</span>
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;text-align:right;vertical-align:top;">
          <span style="font-size:14px;font-weight:700;color:#111827;">₦${(item.price * item.quantity).toLocaleString()}</span>
        </td>
      </tr>`,
      )
      .join("");

    const isCard = paymentMethod?.toLowerCase() !== "cash";
    const paymentBadge = isCard
      ? {
          bg: "#eff6ff",
          color: "#2563eb",
          border: "#bfdbfe",
          label: "💳 " + paymentMethod?.toUpperCase(),
        }
      : {
          bg: "#f0fdf4",
          color: "#16a34a",
          border: "#bbf7d0",
          label: "💵 Pay on Delivery",
        };

    const timeBadge =
      deliveryTime === "Now"
        ? { bg: "#f0fdf4", color: "#16a34a" }
        : deliveryTime === "Tomorrow"
          ? { bg: "#eff6ff", color: "#2563eb" }
          : { bg: "#f9fafb", color: "#6b7280" };

    const orderDate = new Date().toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlEmail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Order #${riderCode}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- HEADER -->
    <tr>
      <td style="background:linear-gradient(135deg,#c2410c 0%,#ea580c 55%,#f97316 100%);border-radius:16px 16px 0 0;padding:40px 40px 36px;text-align:center;">
        <div style="font-size:42px;margin-bottom:10px;line-height:1;">🛵</div>
        <h1 style="margin:0 0 6px;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">New Order Incoming</h1>
        <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">${restaurantName || "Rideex Logistics"}&nbsp;&nbsp;·&nbsp;&nbsp;${orderDate}</p>
        <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:24px;">
          <tr>
            <td style="background:rgba(0,0,0,0.25);border-radius:12px;padding:14px 36px;text-align:center;">
              <div style="color:rgba(255,255,255,0.65);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Rider Code</div>
              <div style="color:#fff;font-size:34px;font-weight:900;letter-spacing:7px;font-family:'Courier New',Courier,monospace;">${riderCode?.toUpperCase()}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style="background:#fff;padding:32px 40px 0;">

        <!-- Status pills -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #f3f4f6;">
          <tr><td>
            <span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${paymentBadge.bg};color:${paymentBadge.color};border:1px solid ${paymentBadge.border};margin-right:6px;">${paymentBadge.label}</span>
            <span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${timeBadge.bg};color:${timeBadge.color};border:1px solid #e5e7eb;margin-right:6px;">🕐 ${deliveryTime || "ASAP"}</span>
            ${deliveryDistance ? `<span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb;">📍 ${deliveryDistance}${deliveryDuration ? " · " + deliveryDuration : ""}</span>` : ""}
          </td></tr>
        </table>

        <!-- Customer + Address -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:28px;">
          <tr>
            <td style="width:50%;padding-right:8px;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;">
                <tr><td style="padding:16px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;">Customer</div>
                  <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:3px;">${customerName || "Guest"}</div>
                  <div style="font-size:13px;color:#6b7280;">${customerPhone}</div>
                </td></tr>
              </table>
            </td>
            <td style="width:50%;padding-left:8px;vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;">
                <tr><td style="padding:16px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;">Deliver to</div>
                  <div style="font-size:13px;color:#374151;line-height:1.6;">${address}</div>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Items -->
        <div style="margin-bottom:28px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">Order Items</div>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #f3f4f6;">Item</th>
                <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #f3f4f6;">Qty</th>
                <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #f3f4f6;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;margin-bottom:4px;">
          <tr><td style="padding:20px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td>
                <td style="padding:5px 0;font-size:13px;font-weight:600;color:#374151;text-align:right;">₦${subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;">Delivery fee</td>
                <td style="padding:5px 0;font-size:13px;font-weight:600;color:#374151;text-align:right;">₦${Number(deliveryFee).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#6b7280;">Service charge</td>
                <td style="padding:5px 0;font-size:13px;font-weight:600;color:#374151;text-align:right;">₦${Number(serviceCharge).toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding:14px 0 10px;">
                  <div style="border-top:2px dashed #e5e7eb;"></div>
                </td>
              </tr>
              <tr>
                <td style="font-size:16px;font-weight:800;color:#111827;">Total</td>
                <td style="font-size:26px;font-weight:900;color:#ea580c;text-align:right;letter-spacing:-0.5px;">₦${total.toLocaleString()}</td>
              </tr>
            </table>
          </td></tr>
        </table>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.8;">
          Automated notification from <strong style="color:#6b7280;">Rideex Logistics</strong><br/>
          Ref: <span style="font-family:'Courier New',monospace;font-weight:700;color:#374151;">${orderId}</span>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Rideex Logistics" <${process.env.WEB_ORDER_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🛵 #${riderCode?.toUpperCase()} · ₦${total.toLocaleString()} · ${customerName || "New Customer"}`,
      html: htmlEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Admin email failed:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
