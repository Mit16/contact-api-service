import ContactSubmission from "../models/contactSubmission.js";
import Project from "../models/project.js";
import Query from "../models/query.js";

/**
 * Creates the main Query Ticket
 */
export const createTicket = async ({
  fullName,
  email,
  phone,
  subject,
  message,
  projectId,
}) => {
  // 1. Create the Query (The "Ticket")
  const newQuery = new Query({
    fullName,
    visitorEmail: email,
    phone,
    subject,
    message,
    projectId,
    status: "PENDING",
    history: [{ status: "PENDING", updatedBy: "SYSTEM_INTAKE" }],
  });

  await newQuery.save();

  // 2. Link to Project
  if (projectId) {
    await Project.findByIdAndUpdate(projectId, {
      $push: { queries: newQuery._id },
    });
  }

  return newQuery;
};

/**
 * Creates a Transaction Log (ContactSubmission) for a specific recipient
 * This is crucial for tracking "First Time" vs "Returning" history per person
 */
export const createSubmissionLog = async ({
  queryId,
  projectId,
  recipientPhone,
  recipientEmail,
  visitorDetails,
}) => {
  const log = new ContactSubmission({
    fullName: visitorDetails.fullName,
    visitorEmail: visitorDetails.email,
    phone: visitorDetails.phone,
    query: queryId,
    projectId: projectId,
    ownerPhone: recipientPhone, // Used for History Check
    ownerEmail: recipientEmail || "staff-notification",
    emailStatus: "PENDING",
    whatsappStatus: "PENDING",
  });

  await log.save();
  return log;
};

export const updateNotificationStatus = async (
  submissionId,
  { email, whatsapp }
) => {
  if (!submissionId) return;
  await ContactSubmission.findByIdAndUpdate(submissionId, {
    emailStatus: email || "SKIPPED",
    whatsappStatus: whatsapp || "FAILED",
  });
};
