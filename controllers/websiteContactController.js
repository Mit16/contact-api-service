import ContactSubmission from "../models/contactSubmission.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
// import { sendToEmail } from "../utils/sendEmail.js"; 

import Project from "../models/project.js";
import Intake from "../models/qa.js";

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
    console.log("🔹 [Controller] Request Body:", JSON.stringify(req.body, null, 2));

    // Validation
    if (!fullName || !email || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    // ---------------------------------------------------------
    // 1️⃣ COLLECT RECIPIENTS (Owner + Intake Staff)
    // ---------------------------------------------------------
    
    // Use a Map to ensure unique phone numbers (Key: Phone, Value: Role)
    const recipientMap = new Map();

    // A. Add Main Business Owner (from frontend payload)
    if (ownerDetails?.phone) {
      const cleanOwnerPhone = String(ownerDetails.phone).replace(/\D/g, "");
      if (cleanOwnerPhone.length >= 10) {
        recipientMap.set(cleanOwnerPhone, "Business Owner");
      }
    }

    // B. Parse Intake for Sales/Telecallers
    if (projectId) {
      try {
        const project = await Project.findById(projectId);
        if (project?.latestIntake) {
          const intake = await Intake.findById(project.latestIntake);
          if (intake?.formData) {
            // Exact question string from your intake form
            const targetQuestion = "What are the names of the partners, and what roles do they play?";
            const rawString = intake.formData[targetQuestion];

            if (rawString && typeof rawString === "string") {
              console.log(`🔹 [Controller] Parsing Intake String: "${rawString}"`);
              
              // Split by comma and TRIM whitespace
              const peopleEntries = rawString.split(",").map(s => s.trim());

              peopleEntries.forEach(entry => {
                // 1. Extract Phone using Regex: looks for digits inside parentheses (999)
                const phoneMatch = entry.match(/\((\d+)\)/);
                const extractedPhone = phoneMatch ? phoneMatch[1] : null;

                if (extractedPhone) {
                  // 2. Extract Name/Role string (remove the phone part)
                  const textPart = entry.replace(/\(\d+\)/, "").toLowerCase().trim();
                  
                  // 3. Check for keywords
                  if (textPart.includes("sales") || textPart.includes("telecaller") || textPart.includes("tellecaller")) {
                     // Add to map (Using phone as key prevents duplicates)
                     recipientMap.set(extractedPhone, "Staff (Sales/Telecaller)");
                     console.log(`🔹 [Controller] Found Staff: ${textPart} -> ${extractedPhone}`);
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ [Controller] Intake Fetch Error:", err.message);
      }
    }

    // ---------------------------------------------------------
    // 2️⃣ WHATSAPP LOOP (Send to all unique recipients)
    // ---------------------------------------------------------
    
    const whatsappResults = [];
    let isAnyWhatsAppSent = false;

    // Iterate over unique phone numbers
    for (const [targetPhone, role] of recipientMap) {
      console.log(`\n🔄 Processing WhatsApp for: ${role} (${targetPhone})`);

      // A. CHECK HISTORY FOR THIS SPECIFIC NUMBER
      // We check if we have ever successfully SENT a message to THIS number
      const history = await ContactSubmission.findOne({
        ownerPhone: targetPhone, 
        whatsappStatus: "SENT"
      });

      // B. SELECT TEMPLATE
      // Existing history -> Normal Template
      // No history -> Hii Button Template
      const templateName = history ? "new_website_lead" : "new_website_lead_hii";
      console.log(`   👉 Status: ${history ? "Returning" : "First Time"} | Template: ${templateName}`);

      // C. PREPARE VARIABLES
      // Note: Both templates must accept the SAME number of variables (5) in your Meta config
      const templateVars = [
        fullName,
        email,
        phone || "N/A",
        subject || "General Inquiry",
        message.substring(0, 100),
      ];

      // D. SEND MESSAGE
      const isSent = await sendWhatsAppMessage({
        to: targetPhone,
        templateName: templateName,
        bodyParameters: templateVars,
        languageCode: "en",
      });

      if (isSent) isAnyWhatsAppSent = true;
      whatsappResults.push({ phone: targetPhone, status: isSent ? "SENT" : "FAILED", template: templateName });

      // E. SAVE INDIVIDUAL DB RECORD (Crucial for History tracking)
      // We save a record for EACH person so the "First Time" check works correctly for them next time.
      try {
        await ContactSubmission.create({
          fullName,
          visitorEmail: email,
          phone: phone || "",
          subject: subject || "General Contact",
          message,
          ownerEmail: ownerDetails?.email || "staff-notification", // Fallback if just staff
          ownerPhone: targetPhone, // <--- This is the key field for history checks
          emailStatus: "SKIPPED", // We only send email to main owner once (handled below)
          whatsappStatus: isSent ? "SENT" : "FAILED",
        });
      } catch (dbErr) {
        console.error("   ❌ DB Save Failed:", dbErr.message);
      }
    }

    // ---------------------------------------------------------
    // 3️⃣ EMAIL LOGIC (Send only ONCE to the Main Business Email)
    // ---------------------------------------------------------
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

    console.log(`🔹 [Controller] Email Logic Skipped (Disabled)`);

    // ---------------------------------------------------------
    // 4️⃣ FINAL RESPONSE
    // ---------------------------------------------------------
    
    if (isAnyWhatsAppSent || isEmailSent) {
      return res.status(200).json({
        success: true,
        message: "Notifications processed.",
        results: {
          whatsapp: whatsappResults,
          email: isEmailSent ? "SENT" : "SKIPPED"
        }
      });
    } else {
      // Only fail if EVERYTHING failed
      return res.status(500).json({
        success: false,
        message: "Failed to deliver any notifications.",
        results: whatsappResults
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