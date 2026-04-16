// wrapper around ipos-pu's IPUCommsAPI.sendEmail
// ipos-pu uses sendEmail(email, body, subject) but we call it notifyApplication
// so it makes more sense in our codebase

import { apiClient } from './apiClient';

// endpoint on ipos-pu that maps to IPUCommsAPI.sendEmail
const IPU_SEND_EMAIL_ENDPOINT = '/ipu/email';

// formats the email content based on the outcome and sends it to ipos-pu
// returns true if it worked, false if not
export async function notifyApplication(email, regNumber, outcome) {
  // pending isnt a final state so nothing to send
  if (outcome !== 'approved' && outcome !== 'rejected') {
    return false;
  }

  // build subject and body depending on whether they got approved or not
  let subject, body;

  if (outcome === 'approved') {
    subject = 'Your InfoPharma commercial application has been approved';
    body =
      `Your commercial application (reg. ${regNumber}) has been approved. ` +
      `Your account team will be in touch shortly with your login credentials.\n\n` +
      `Kind regards,\nInfoPharma Ltd`;
  } else {
    subject = 'Your InfoPharma commercial application has been unsuccessful';
    body =
      `Your commercial application (reg. ${regNumber}) has been reviewed ` +
      `and unfortunately has not been approved at this time.\n\n` +
      `Kind regards,\nInfoPharma Ltd`;
  }

  try {
    // this is the actual call to IPUCommsAPI.sendEmail on ipos-pu
    await apiClient.post(IPU_SEND_EMAIL_ENDPOINT, { email, subject, body });
    return true;
  } catch (error) {
    console.error('failed to notify applicant via ipos-pu:', error);
    return false;
  }
}

export default { notifyApplication };
