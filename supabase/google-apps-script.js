/**
 * PM Exchange Google Apps Script v2
 * Handles two types: "request" (notify host) and "accept" (generate meet + email both)
 *
 * Setup: script.google.com → New project → paste this → Deploy as Web App
 * Execute as: Me | Who has access: Anyone
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type || "request";

    if (type === "request") {
      // Notify host of new request
      var body =
        "Hey " + data.hostName + ",\n\n" +
        data.bookerName + " has sent you an interview request on PM Exchange!\n\n" +
        "Log in to accept or decline: https://pm-exchange.vercel.app/sessions\n\n" +
        (data.note ? 'Their message: "' + data.note + '"\n\n' : "") +
        "— PM Exchange";
      MailApp.sendEmail({ to: data.hostEmail, subject: data.bookerName + " wants a PM practice session with you", body: body });
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (type === "accept") {
      // Create calendar event + meet link
      var start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      var end = new Date(start.getTime() + 45 * 60 * 1000);
      var cal = CalendarApp.getDefaultCalendar();
      var event = cal.createEvent(
        "PM Exchange: " + data.bookerName + " ↔ " + data.hostName,
        start, end,
        {
          description: "Coordinate a time over WhatsApp — this is a placeholder.\n\n" +
            data.bookerName + ": " + (data.bookerWhatsapp || data.bookerEmail) + "\n" +
            data.hostName + ": " + (data.hostWhatsapp || data.hostEmail),
          guests: data.bookerEmail + "," + data.hostEmail,
          sendInvites: false,
        }
      );

      var meetLink = "https://meet.google.com (see calendar invite)";
      try {
        var conf = event.getConferenceData();
        if (conf) meetLink = conf.getEntryPoints()[0].getUri();
      } catch(e) {}

      // Email both
      var bookerBody = "Hey " + data.bookerName + ",\n\n" +
        data.hostName + " accepted your session request! 🎉\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "Interviewer: " + data.hostName + "\n" +
        (data.hostWhatsapp ? "WhatsApp: " + data.hostWhatsapp + "\n" : "") +
        "Email: " + data.hostEmail + "\n" +
        "━━━━━━━━━━━━━━━━━━━━\n\n" +
        "📅 Coordinate a time over WhatsApp.\n" +
        "🎥 Meet link: " + meetLink + "\n\n— PM Exchange";

      var hostBody = "Hey " + data.hostName + ",\n\n" +
        "You accepted " + data.bookerName + "'s request.\n\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "Interviewee: " + data.bookerName + "\n" +
        (data.bookerWhatsapp ? "WhatsApp: " + data.bookerWhatsapp + "\n" : "") +
        "Email: " + data.bookerEmail + "\n" +
        "━━━━━━━━━━━━━━━━━━━━\n\n" +
        "📅 Coordinate a time over WhatsApp.\n" +
        "🎥 Meet link: " + meetLink + "\n\n" +
        "✅ Mark the session done in the app to earn +1 credit.\n\n— PM Exchange";

      MailApp.sendEmail({ to: data.bookerEmail, subject: "Session accepted — Meet link inside 🎥", body: bookerBody });
      MailApp.sendEmail({ to: data.hostEmail, subject: "You accepted " + data.bookerName + "'s request", body: hostBody });

      return ContentService.createTextOutput(JSON.stringify({ ok: true, meetLink: meetLink })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
