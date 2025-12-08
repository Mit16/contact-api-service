import axios from "axios";
import { WHATSAPP_CONFIG } from "../config/whatsappConfig.js";

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${WHATSAPP_CONFIG.phoneNumberId}/messages`;

/**
 * Sends a WhatsApp Template Message.
 * STRICTLY for business-initiated notifications.
 *
 * @param {Object} params
 * @param {string} params.to - The recipient's phone number (with country code).
 * @param {string} params.templateName - The exact name of the template in WhatsApp Manager.
 * @param {Array} params.bodyParameters - Array of strings to fill {{1}}, {{2}}, etc.
 * @param {string} params.languageCode - Language code (default "en_US").
 */
export const sendWhatsAppMessage = async ({
  to,
  templateName,
  bodyParameters = [],
  languageCode = "en_US",
}) => {
  try {
    console.log("📢 [WhatsApp Service] Preparing message...");

    // 1. Sanitize Phone Number (Remove +, spaces, dashes)
    const formattedPhone = String(to).replace(/\D/g, "");
    console.log(`🔹 Raw Phone: ${to} -> Formatted: ${formattedPhone}`);

    if (!formattedPhone || formattedPhone.length < 10) {
      console.error("❌ [WhatsApp Service] Invalid phone number.");
      return false;
    }

    // 2. Construct Components (Body Parameters)
    // Map the simple array of strings to the specific object structure WhatsApp requires
    const components = [
      {
        type: "body",
        parameters: bodyParameters.map((param) => ({
          type: "text",
          text: String(param), // Ensure it's a string
        })),
      },
    ];

    // 3. Build Payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components,
      },
    };

    console.log(
      "🚀 [WhatsApp Service] Final Payload:",
      JSON.stringify(payload, null, 2)
    );

    // 4. Send Request
    const res = await axios.post(WHATSAPP_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      "✅ [WhatsApp Service] API Response:",
      JSON.stringify(res.data, null, 2)
    );
    return true; // Return success boolean
  } catch (error) {
    const errData = error.response?.data || error.message;
    console.error(
      "⚠️ [WhatsApp Service] API Error:",
      JSON.stringify(errData, null, 2)
    );

    // Detailed error logging for common issues
    if (error.response?.data?.error?.code === 100) {
      console.error(
        "👉 TIP: Check if the template name matches EXACTLY with Meta Dashboard."
      );
      console.error(
        "👉 TIP: Check if the number of parameters matches the template (5 variables needed)."
      );
    }

    return false; // Return failure boolean
  }
};
