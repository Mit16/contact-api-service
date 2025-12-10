import ContactSubmission from "../models/contactSubmission.js";
import Project from "../models/project.js";
import Query from "../models/query.js";

/**
 * Creates a Query ticket and the associated Contact Submission log
 */
export const createTicket = async ({
  fullName,
  email,
  phone,
  subject,
  message,
  ownerEmail,
  ownerPhone,
  projectId,
}) => {
  // 1. Create the Query (The "Ticket")
  const newQuery = new Query({
    fullName,
    visitorEmail: email,
    phone,
    subject,
    message,
    projectId: projectId,
    status: "PENDING",
    history: [{ status: "PENDING", updatedBy: "SYSTEM_INTAKE" }],
  });

  // 2. Create the Submission (The "Log")
  const newSubmission = new ContactSubmission({
    fullName,
    visitorEmail: email,
    phone,
    ownerEmail,
    ownerPhone,
    projectId: projectId,
    query: newQuery._id, // Link to Query
    emailStatus: "PENDING", // Will be updated by controller after sending
    whatsappStatus: "PENDING",
  });

  // 3. Link Query back to Submission
  newQuery.submission = newSubmission._id;

  // 4. Save Both
  await newQuery.save();
  await newSubmission.save();

  // 5. Link to Project (if ID provided)
  if (projectId) {
    await Project.findByIdAndUpdate(projectId, {
      $push: { queries: newQuery._id },
    });
  }

  return { query: newQuery, submission: newSubmission };
};

/**
 * Update submission status after notifications are sent
 */
export const updateNotificationStatus = async (
  submissionId,
  { email, whatsapp }
) => {
  await ContactSubmission.findByIdAndUpdate(submissionId, {
    emailStatus: email,
    whatsappStatus: whatsapp,
  });
};
