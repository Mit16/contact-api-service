import ContactSubmission from "../models/contactSubmission.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
// 👇 IMPORTED CORRECTLY
import {
  createTicket,
  createSubmissionLog,
  updateNotificationStatus,
} from "../services/queryService.js";
import Employee from "../models/employee.js";
// import { sendToEmail } from "../utils/emailService.js";

/**
 * HELPER: Fetch Recipients (Owner + Relevant Employees)
 */
const getRecipients = async (ownerDetails, projectId) => {
  const recipientMap = new Map();

  // 1. Add Main Business Owner (Always included)
  if (ownerDetails?.phone) {
    const cleanPhone = String(ownerDetails.phone).replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      recipientMap.set(cleanPhone, {
        role: "Business Owner",
        email: ownerDetails.email,
      });
    }
  }

  // 2. Fetch Employees from DB (Sales & Telecallers)
  if (projectId) {
    try {
      // Find employees linked to this project with specific roles
      const staff = await Employee.find({
        project: projectId,
        isActive: true,
        // Case-insensitive check for roles
        role: {
          $in: [
            /^Sales$/i,
            /^Telecaller$/i,
            /^Sales Executive$/i,
            /^Manager$/i,
          ],
        },
      });

      console.log(
        `🔹 [Helper] Found ${staff.length} staff members for notification.`
      );

      staff.forEach((emp) => {
        if (emp.phone) {
          const empPhone = String(emp.phone).replace(/\D/g, "");
          // Avoid duplicates (if Owner is also listed as Employee)
          if (!recipientMap.has(empPhone)) {
            recipientMap.set(empPhone, {
              role: emp.role,
              email: emp.email, // We capture email but won't send for now as requested
            });
          }
        }
      });
    } catch (e) {
      console.warn("⚠️ [Helper] Employee Fetch Error:", e.message);
    }
  }
  return recipientMap;
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

    // Log raw body
    console.log(
      "🔹 [Controller] Request Body:",
      JSON.stringify(req.body, null, 2)
    );

    if (!fullName || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // 1. CREATE TICKET (The central Query object)
    const newQuery = await createTicket({
      fullName,
      email,
      phone,
      subject,
      message,
      projectId,
    });
    console.log(`✅ Ticket Created: ${newQuery._id}`);

    // 2. GET RECIPIENTS
    const recipientMap = await getRecipients(ownerDetails, projectId);

    const whatsappResults = [];
    let isAnySent = false;

    // 3. PROCESS NOTIFICATIONS LOOP
    for (const [targetPhone, info] of recipientMap) {
      console.log(`\n🔄 Processing for: ${info.role} (${targetPhone})`);

      // A. Create Log (To track individual history)
      const log = await createSubmissionLog({
        queryId: newQuery._id,
        projectId,
        recipientPhone: targetPhone,
        recipientEmail: info.email,
        recipientRole: info.role,
        visitorDetails: { fullName, email, phone },
      });

      // B. Check History (Using the NEW log structure)
      const history = await ContactSubmission.findOne({
        ownerPhone: targetPhone,
        whatsappStatus: "SENT",
        _id: { $ne: log._id }, // Exclude current log
      });

      const templateName = history
        ? "new_website_lead"
        : "new_website_lead_hii";
      console.log(
        `   👉 Template: ${templateName} (${
          history ? "Returning" : "First Time"
        })`
      );

      // C. Send WhatsApp
      const templateVars = [
        fullName,
        email,
        phone || "N/A",
        subject || "General Inquiry",
        message.substring(0, 100),
      ];

      const isWaSent = await sendWhatsAppMessage({
        to: targetPhone,
        templateName: templateName,
        bodyParameters: templateVars,
        languageCode: "en",
      });

      if (isWaSent) isAnySent = true;
      whatsappResults.push({
        phone: targetPhone,
        status: isWaSent ? "SENT" : "FAILED",
      });

      // D. Send Email (Only if this recipient has an email, e.g., Owner)
      let isEmailSent = false;
      /* if (info.email) {
             isEmailSent = await sendToEmail({ ... });
        } 
        */

      // E. Update the Log Status
      await updateNotificationStatus(log._id, {
        email: isEmailSent ? "SENT" : "SKIPPED",
        whatsapp: isWaSent ? "SENT" : "FAILED",
      });
    }

    // 4. RESPONSE
    if (isAnySent) {
      return res.status(200).json({
        success: true,
        message: "Ticket created and notifications sent.",
        ticketId: newQuery._id,
        debug: whatsappResults,
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
