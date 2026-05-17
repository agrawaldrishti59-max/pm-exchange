// PM Exchange app configuration.
//
// AUTO_APPROVE controls whether new members are approved instantly.
//
//   true  = testing mode. Everyone who signs up is auto-approved and
//           given 2 credits immediately. The "pending review" banner
//           never shows. Use this during early testing and feedback.
//
//   false = manual mode. New members start as "pending" with 0 credits
//           and must be approved from the /admin page, which grants
//           2 credits on approval.
//
// To switch later, change this one value and redeploy. Nothing else.
export const AUTO_APPROVE = true;
