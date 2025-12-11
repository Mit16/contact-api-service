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
    history: [
      {
        action: "CREATED",
        note: "Ticket received from website",
        updatedBy: "SYSTEM",
      },
    ],
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
  recipientRole, // "Owner", "Sales", etc.
  visitorDetails,
}) => {
  const log = new ContactSubmission({
    fullName: visitorDetails.fullName,
    visitorEmail: visitorDetails.email,
    phone: visitorDetails.phone,
    query: queryId,
    projectId: projectId,
    ownerPhone: recipientPhone,
    ownerEmail: recipientEmail || "staff-notification",
    recipientRole: recipientRole, // 👇 Saving it here
    emailStatus: "PENDING",
    whatsappStatus: "PENDING",
  });

  await log.save();

  // Link this log back to the Query (so we know who was notified)
  await Query.findByIdAndUpdate(queryId, {
    $push: { submissions: log._id },
  });

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
