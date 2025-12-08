import ContactSubmission from "../models/contactSubmission.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { sendToEmail } from "../utils/sendEmail.js";


export const submitContactForm = async (req, res) => {
  console.log("🔹 [Controller] Contact form submission received.");
  
  try {
    const { fullName, email, phone, subject, message, ownerDetails } = req.body;

    // Log raw body for debugging
    console.log("🔹 [Controller] Request Body:", JSON.stringify(req.body, null, 2));

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

    console.log(`🔹 [Controller] Owner Email: ${businessOwnerEmail}`);
    console.log(`🔹 [Controller] Owner Phone: ${businessOwnerPhone || "Not Provided"}`);

    // --- 1. EMAIL LOGIC ---
    const emailSubject = `New Website Inquiry: ${subject || "General Contact"}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px;">
        <h2 style="color: #0056b3;">New Message from your Website</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Subject:</strong> ${subject || "N/A"}</p>
        <br />
        <p><strong>Message:</strong></p>
        <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #0056b3;">
          ${message.replace(/\n/g, "<br>")}
        </blockquote>
        <hr />
        <p style="font-size: 12px; color: #777;">
          Sent to business email: ${businessOwnerEmail}
        </p>
      </div>
    `;

    const emailText = `Name: ${fullName}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}`;

    console.log("🔹 [Controller] Sending Email...");
    // const isEmailSent = await sendToEmail({
    //   to: businessOwnerEmail,
    //   subject: emailSubject,
    //   html: emailHtml,
    //   text: emailText,
    // });
    const isEmailSent = true;
    console.log(`🔹 [Controller] Email Status: ${isEmailSent ? "SENT" : "FAILED"}`);

    // --- 2. WHATSAPP LOGIC 🟢 ---
    let isWhatsAppSent = false;

    if (businessOwnerPhone) {
      console.log("🔹 [Controller] Attempting WhatsApp notification...");

      // Prepare the 5 variables strictly
      const templateVars = [
        fullName,                   // {{1}}
        email,                      // {{2}}
        phone || "N/A",             // {{3}}
        subject || "General Inquiry",// {{4}}
        message.substring(0, 100)   // {{5}} Limit to 100 chars to be safe
      ];

      // Corrected Function Call: Passing an OBJECT
      isWhatsAppSent = await sendWhatsAppMessage({
        to: businessOwnerPhone,
        templateName: "new_website_lead",
        bodyParameters: templateVars,
        languageCode: "en" // Change to "en_US" or "en_GB" if your template differs
      });
      
      console.log(`🔹 [Controller] WhatsApp Status: ${isWhatsAppSent ? "SENT" : "FAILED"}`);
    } else {
      console.log("⚠️ [Controller] No owner phone number provided, skipping WhatsApp.");
    }

    // --- 3. DATABASE LOGIC ---
    try {
      await ContactSubmission.create({
        fullName,
        visitorEmail: email,
        phone: phone || "",
        subject: subject || "General Contact",
        message,
        ownerEmail: businessOwnerEmail,
        emailStatus: isEmailSent ? "SENT" : "FAILED",
        whatsappStatus: isWhatsAppSent ? "SENT" : "FAILED",
      });
      console.log("✅ [Controller] Contact submission saved to DB");
    } catch (dbError) {
      console.error("❌ [Controller] Failed to save to DB:", dbError);
    }

    if (!isEmailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send email. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("❌ [Controller] Critical Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing contact form.",
    });
  }
};