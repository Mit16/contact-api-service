import Project from "../models/project.js";
import Intake from "../models/qa.js";
import ContactSubmission from "../models/contactSubmission.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { createTicket } from "../services/queryService.js";
// import { sendToEmail } from "../utils/sendEmail.js";

/**
 * HELPER: Extracts Owner + Staff recipients from Project/Intake
 */
const getRecipients = async (ownerDetails, projectId) => {
  const recipientMap = new Map();

  // 1. Add Owner
  if (ownerDetails?.phone) {
    const cleanPhone = String(ownerDetails.phone).replace(/\D/g, "");
    if (cleanPhone.length >= 10) recipientMap.set(cleanPhone, "Business Owner");
  }

  // 2. Parse Intake for Staff
  if (projectId) {
    try {
      const project = await Project.findById(projectId);
      if (project?.latestIntake) {
        const intake = await Intake.findById(project.latestIntake);
        const rawString =
          intake?.formData?.[
            "What are the names of the partners, and what roles do they play?"
          ];

        if (typeof rawString === "string") {
          console.log(`🔹 [Helper] Parsing Intake: "${rawString}"`);
          rawString.split(",").forEach((entry) => {
            const phoneMatch = entry.match(/\((\d+)\)/);
            if (phoneMatch) {
              const phone = phoneMatch[1];
              const roleText = entry.replace(/\(\d+\)/, "").toLowerCase();
              if (
                ["sales", "telecaller", "tellecaller"].some((k) =>
                  roleText.includes(k)
                )
              ) {
                recipientMap.set(phone, "Staff");
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn("⚠️ [Helper] Intake Parse Error:", e.message);
    }
  }
  return recipientMap;
};

/**
 * HELPER: Handles the loop of sending WhatsApp messages
 */
const processWhatsAppQueue = async (recipientMap, templateData) => {
  const results = [];
  let anySent = false;

  const { fullName, email, phone, subject, message } = templateData;
  const templateVars = [
    fullName,
    email,
    phone || "N/A",
    subject || "General Inquiry",
    message.substring(0, 100),
  ];

  for (const [targetPhone, role] of recipientMap) {
    console.log(`\n🔄 Processing: ${role} (${targetPhone})`);

    // Check History logic (using the imported Model directly for read checks)
    const history = await ContactSubmission.findOne({
      ownerPhone: targetPhone,
      whatsappStatus: "SENT",
    });
    const templateName = history ? "new_website_lead" : "new_website_lead_hii";

    const isSent = await sendWhatsAppMessage({
      to: targetPhone,
      templateName,
      bodyParameters: templateVars,
      languageCode: "en",
    });

    if (isSent) anySent = true;
    results.push({ phone: targetPhone, status: isSent ? "SENT" : "FAILED" });
  }

  return { anySent, results };
};

export const submitContactForm = async (req, res) => {
  console.log("🔹 [Controller] Contact form submission received.");

  try {
    const {
      fullName,
      email,
      phone,
      subject,
      message,
      ownerDetails,
      projectId,
    } = req.body;

    // Log raw body for debugging
    console.log(
      "🔹 [Controller] Request Body:",
      JSON.stringify(req.body, null, 2)
    );

    // Validation
    if (!fullName || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // 2. RECIPIENT LOGIC (Modularized)
    const recipientMap = await getRecipients(ownerDetails, projectId);

    // 3. DB OPERATIONS (Using Service)
    // We create the Query/Ticket first to get IDs
    const { submission } = await createTicket({
      fullName,
      email,
      phone,
      subject,
      message,
      ownerEmail: ownerDetails?.email,
      ownerPhone: ownerDetails?.phone
        ? String(ownerDetails.phone).replace(/\D/g, "")
        : "",
      projectId,
    });

    console.log(`✅ Ticket Created. Submission ID: ${submission._id}`);

    // 4. SEND NOTIFICATIONS

    // A. WhatsApp (Loop)
    const waResult = await processWhatsAppQueue(recipientMap, {
      fullName,
      email,
      phone,
      subject,
      message,
    });

    // B. Email (Single)
    let isEmailSent = false;
    /* try {
       isEmailSent = await sendToEmail({ ... }); 
    } catch(e) { console.error(e) } 
    */
    console.log(
      `🔹 Email: SKIPPED | WhatsApp: ${waResult.anySent ? "SENT" : "FAILED"}`
    );

    // 5. UPDATE STATUS
    // Update the logs with the final status of the notifications
    await updateNotificationStatus(submission._id, {
      email: isEmailSent ? "SENT" : "SKIPPED",
      whatsapp: waResult.anySent ? "SENT" : "FAILED",
    });

    // 6. RESPONSE
    if (waResult.anySent || isEmailSent) {
      return res.status(200).json({
        success: true,
        message: "Ticket created and notifications sent.",
        ticketId: submission.query, // Send back the Query ID for reference
        debug: waResult.results,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Ticket created but notifications failed.",
      });
    }
  } catch (error) {
    console.error("❌ [Controller] Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
