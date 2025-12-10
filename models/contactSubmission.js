import mongoose from "mongoose";

const contactSubmissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    phone: { type: String }, // User's phone

    // Link to the Ticket content
    query: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },

    // The person receiving this notification
    ownerEmail: { type: String, required: false }, // Made optional for staff notifications
    ownerPhone: { type: String, required: false }, // Key for WhatsApp history

    emailStatus: {
      type: String,
      enum: ["SENT", "PENDING", "FAILED", "SKIPPED"],
      default: "PENDING",
    },
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
