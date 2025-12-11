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
 * 🛠️ HELPER: Robust Phone Number Sanitizer
 * - Removes non-digits
 * - Removes leading '0'
 * - Adds '91' (India) default if missing on 10-digit numbers
 */
const sanitizePhoneNumber = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, ""); // Remove + - ( ) spaces

  // Handle leading 0 (Common in India: 098...) -> 98...
  if (p.startsWith("0")) {
    p = p.substring(1);
  }

  // If length is 10, assume India and prepend 91
  if (p.length === 10) {
    p = "91" + p;
  }

  // Validate: WhatsApp usually requires 12 digits for India (91 + 10 digits)
  // or generally > 10 digits for intl.
  if (p.length < 10) return null;

  return p;
};

/**
 * HELPER: Fetch Recipients (Owner + Relevant Employees)
 */
const getRecipients = async (ownerDetails, projectId) => {
  const recipientMap = new Map();

  // 1. Add Main Business Owner
  if (ownerDetails?.phone) {
    const cleanPhone = sanitizePhoneNumber(ownerDetails.phone);
    if (cleanPhone) {
      recipientMap.set(cleanPhone, {
        role: "Business Owner",
        email: ownerDetails.email,
      });
    }
  }

  // 2. Fetch Employees from DB (Strictly Sales & Telecallers)
  if (projectId) {
    try {
      const staff = await Employee.find({
        project: projectId,
        isActive: true,
        // 👇 FIXED: Strictly look for Sales or Telecaller variants (Case Insensitive)
        // This Regex matches "Sales", "Sales Executive", "Telecaller", "Tellecaller"
        role: { $in: [/Sales/i, /Telecaller/i, /Tellecaller/i] },
      });

      console.log(`🔹 [Helper] Found ${staff.length} eligible staff members.`);

      staff.forEach((emp) => {
        const empPhone = sanitizePhoneNumber(emp.phone);

        // Only add if we have a valid phone and it's not already in the list
        if (empPhone && !recipientMap.has(empPhone)) {
          recipientMap.set(empPhone, {
            role: emp.role, // e.g., "Sales", "Telecaller"
            email: emp.email,
          });
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
      return res.status(200).json({
        success: true,
        message:
          "Ticket created (Notifications failed or no eligible recipients).",
        ticketId: newQuery._id,
        debug: whatsappResults,
      });
    }
  } catch (error) {
    console.error("❌ [Controller] Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
