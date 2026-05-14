import { Resend } from "resend";

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log("SKIPPING email send: RESEND_API_KEY is missing. Verification link:", confirmLink);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "Pulso <onboarding@resend.dev>";
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Confirma tu correo en Pulso",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px;">
          <h1 style="font-size: 24px; font-weight: 800; color: #1da1f2;">Pulso</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #0f1419;">
            ¡Bienvenido a Pulso! Por favor, confirma tu dirección de correo electrónico para activar tu cuenta.
          </p>
          <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #1da1f2; color: #ffffff; text-decoration: none; border-radius: 9999px; font-weight: 700; margin-top: 10px;">
            Confirmar Correo
          </a>
          <p style="font-size: 14px; color: #536471; margin-top: 20px;">
            Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      console.log("FALLBACK LINK (Resend failed):", confirmLink);
    } else {
      console.log("Email sent successfully via Resend!", data);
    }
  } catch (error) {
    console.error("Error sending email:", error);
    console.log("FALLBACK LINK (Exception):", confirmLink);
  }
};
