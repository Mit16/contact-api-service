import mongoose from "mongoose";

const contactSubmissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    phone: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    ownerEmail: { type: String, required: true },

    // 👇 ADDED: To track the owner's phone for the "First Time" check
    ownerPhone: { type: String, required: false },

    emailStatus: {
      type: String,
      enum: ["SENT", "FAILED", "SKIPPED"],
      default: "FAILED",
    },
    // 👇 ADDED: To track if WhatsApp was successful
    whatsappStatus: {
      type: String,
      enum: ["SENT", "FAILED", "PENDING"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const ContactSubmission = mongoose.model(
  "ContactSubmission",
  contactSubmissionSchema
);

export default ContactSubmission;
