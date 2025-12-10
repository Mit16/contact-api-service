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
    
    // Audit Trail: Who changed the status and when
    history: [
      {
        status: String,
        updatedBy: { type: String, default: "SYSTEM" }, // Could be Admin ID later
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Relationships
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: "ContactSubmission" },
  },
  { timestamps: true }
);

const Query = mongoose.models.Query || mongoose.model("Query", querySchema);
export default Query;