import mongoose from "mongoose";

const contactSubmissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    phone: { type: String },
 
    ownerEmail: { type: String, required: true },
    ownerPhone: { type: String, required: false },

    // 👇 CHANGED: Removed subject/message, added link to Query
    query: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },

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
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);

const ContactSubmission = mongoose.model(
  "ContactSubmission",
  contactSubmissionSchema
);

export default ContactSubmission;
