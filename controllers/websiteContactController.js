import ContactSubmission from "../models/contactSubmission.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { sendToEmail } from "../utils/sendEmail.js";

export const submitContactForm = async (req, res) => {
  console.log("🔹 [Controller] Contact form submission received.");

  try {
    const { fullName, email, phone, subject, message, ownerDetails } = req.body;

    // Log raw body for debugging
    console.log(
      "🔹 [Controller] Request Body:",
      JSON.stringify(req.body, null, 2)
    );

    const businessOwnerEmail = ownerDetails?.email;
    const businessOwnerPhone = ownerDetails?.phone;

    // Validation
    if (!fullName || !email || !message || !businessOwnerEmail) {
      console.warn("⚠️ [Controller] Validation Failed. Missing fields.");
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    // --- 1. EMAIL LOGIC ---
    let isEmailSent = false;

    // Uncomment this to enable email
    /* try {
        console.log("🔹 [Controller] Sending Email...");
        isEmailSent = await sendToEmail({
            to: businessOwnerEmail,
            subject: `New Website Inquiry: ${subject || "General Contact"}`,
            html: `<p>Name: ${fullName}</p><p>Message: ${message}</p>`, // Simplified for brevity
            text: `Name: ${fullName}\nMessage: ${message}`
        });
    } catch (e) {
        console.error("Email Error", e);
    }
    */

    // FOR TESTING WHATSAPP ONLY: Keep this false for now
    // isEmailSent = false;

    console.log(
      `🔹 [Controller] Email Status: ${isEmailSent ? "SENT" : "SKIPPED/FAILED"}`
    );

    // --- 2. WHATSAPP LOGIC 🟢 ---
    let isWhatsAppSent = false;
    let templateUsed = "none";

    if (businessOwnerPhone) {
      console.log("🔹 [Controller] Processing WhatsApp...");

      // 1. Sanitize the phone number to match DB records (remove non-digits)
      const formattedOwnerPhone = String(businessOwnerPhone).replace(/\D/g, "");

      // 2. CHECK HISTORY: Has this number successfully received a message before?
      const existingHistory = await ContactSubmission.findOne({
        ownerPhone: formattedOwnerPhone,
        whatsappStatus: "SENT", // Only counts if it was actually delivered/sent previously
      });

      // 3. DECIDE TEMPLATE
      // If history exists -> Use Normal Template
      // If NO history -> Use "Hii" Button Template
      const templateName = existingHistory
        ? "new_website_lead" // Standard template
        : "new_website_lead_hii"; // Template with "Hii" Button

      templateUsed = templateName;
      console.log(
        `🔹 [Controller] User Status: ${existingHistory ? "Returning" : "New"}`
      );
      console.log(`🔹 [Controller] Selected Template: ${templateName}`);

      const templateVars = [
        fullName,
        email,
        phone || "N/A",
        subject || "General Inquiry",
        message.substring(0, 100),
      ];

      isWhatsAppSent = await sendWhatsAppMessage({
        to: formattedOwnerPhone,
        templateName: templateName,
        bodyParameters: templateVars,
        languageCode: "en",
      });

      console.log(
        `🔹 [Controller] WhatsApp Status: ${isWhatsAppSent ? "SENT" : "FAILED"}`
      );
    } else {
      console.log(
        "⚠️ [Controller] No owner phone number provided, skipping WhatsApp."
      );
    }

    // --- 3. DATABASE LOGIC ---
    // We save the normalized ownerPhone so future checks work correctly
    try {
      await ContactSubmission.create({
        fullName,
        visitorEmail: email,
        phone: phone || "",
        subject: subject || "General Contact",
        message,
        ownerEmail: businessOwnerEmail,
        ownerPhone: businessOwnerPhone
          ? String(businessOwnerPhone).replace(/\D/g, "")
          : "",
        emailStatus: isEmailSent ? "SENT" : "FAILED",
        whatsappStatus: isWhatsAppSent ? "SENT" : "FAILED",
      });
      console.log("✅ [Controller] Contact submission saved to DB");
    } catch (dbError) {
      console.error("❌ [Controller] Failed to save to DB:", dbError);
    }

    // --- 4. RESPONSE ---
    if (isEmailSent || isWhatsAppSent) {
      return res.status(200).json({
        success: true,
        message: "Message processed successfully!",
        debug: {
          email: isEmailSent,
          whatsapp: isWhatsAppSent,
          template: templateUsed,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to deliver message via Email or WhatsApp.",
      });
    }
  } catch (error) {
    console.error("❌ [Controller] Critical Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing contact form.",
    });
  }
};
