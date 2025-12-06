import mongoose from "mongoose";

const contactSubmissionSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    phone: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    emailStatus: {
      type: String,
      enum: ["SENT", "FAILED"],
      default: "FAILED",
    },
  },
  { timestamps: true }
);

const ContactSubmission = mongoose.model(
  "ContactSubmission",
  contactSubmissionSchema
);

export default ContactSubmission;
