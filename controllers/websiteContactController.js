// controller/websiteContactController.js
import ContactSubmission from "../models/contactSubmission.js";
import { sendToEmail } from "../utils/sendEmail.js";



export const submitContactForm = async (req, res) => {
  try {
    // 1. Destructure the incoming data based on the new structure
    const {
      fullName,
      email, // The visitor's email
      phone,
      subject,
      message,
      ownerDetails, // The object containing { phone, email, address... }
    } = req.body;

    // 2. Extract the business owner's email from the object
    const businessOwnerEmail = ownerDetails?.email;

    // 3. Validation
    if (!fullName || !email || !message || !businessOwnerEmail) {
      console.warn("[Contact Form] Validation Failed. Missing fields.");
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Ensure Name, Email, Message, and Owner Details are present.",
      });
    }

    console.log(
      `[Contact Form] Processing message for Business Owner: ${businessOwnerEmail}`
    );
    console.log(`[Contact Form] From Visitor: ${fullName} (${email})`);

    // 4. Construct Email Content
    const emailSubject = `New Website Inquiry: ${subject || "General Contact"}`;

    // HTML Body
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px;">
        <h2 style="color: #0056b3;">New Message from your Website</h2>
        <p><strong>You have received a new inquiry via your contact form.</strong></p>
        <hr />
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
          Sent to business email: ${businessOwnerEmail}<br>
          Business Phone: ${ownerDetails.phone || "N/A"}
        </p>
      </div>
    `;

    // Plain Text Body (Fallback)
    const emailText = `
      New Website Inquiry: ${subject || "General Contact"}
      -----------------------------------------------
      Name: ${fullName}
      Email: ${email}
      Phone: ${phone || "N/A"}
      
      Message:
      ${message}
    `;

    // 5. Send Email using Nodemailer
    const isSent = await sendToEmail({
      to: businessOwnerEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    // 6. SAVE TO DATABASE 💾
    // We save regardless of whether the email failed or succeeded,
    // so we have a record of the attempt.
    try {
      await ContactSubmission.create({
        fullName,
        visitorEmail: email, // Mapping 'email' from body to 'visitorEmail' in schema
        phone: phone || "",
        subject: subject || "General Contact",
        message,
        ownerEmail: businessOwnerEmail,
        emailStatus: isSent ? "SENT" : "FAILED", // 👈 Saves the status
      });
      console.log("✅ Contact submission saved to DB");
    } catch (dbError) {
      console.error("❌ Failed to save contact submission to DB:", dbError);
      // We don't return here because if email was sent, we still want to tell the user success
    }

    if (!isSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send email. Please try again later.",
      });
    }

    // 6. Return Success Response
    return res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("Error in submitContactForm:", error);
    return res.status(500).json({
      success: false,
      message: "Server error processing contact form.",
    });
  }
};
