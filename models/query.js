import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    visitorEmail: { type: String, required: true },
    phone: { type: String },

    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Status Tracking
    status: {
      type: String,
      enum: ["PENDING", "CONTACTED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING",
    },

    // 👤 Assignment (Who picked this up?)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // ⏰ Escalation Logic (For dashboard alerts)
    escalationDueAt: { type: Date }, // e.g., CreatedAt + 24 hours
    isEscalated: { type: Boolean, default: false },

    // 📜 History & Audit
    history: [
      {
        action: String, // e.g., "STATUS_CHANGE", "ASSIGNED"
        note: String,
        updatedBy: String, // Employee Name or "SYSTEM"
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Relationships
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactSubmission",
    },
  },
  { timestamps: true }
);

// Auto-set escalation deadline (e.g., 24 hours) on creation
querySchema.pre("save", function (next) {
  if (this.isNew && !this.escalationDueAt) {
    const twentyFourHours = 3 * 24 * 60 * 60 * 1000;
    this.escalationDueAt = new Date(Date.now() + twentyFourHours);
  }
  next();
});

const Query = mongoose.models.Query || mongoose.model("Query", querySchema);
export default Query;
