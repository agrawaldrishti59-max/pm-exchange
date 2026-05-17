/**
 * PM Exchange Google Apps Script v3
 *
 * Prerequisite: In the Apps Script editor, click Services (+) in the left
 * sidebar and add "Google Calendar API" (the Advanced Calendar Service).
 * This is required for real Google Meet links.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Then copy the URL into Vercel env var GOOGLE_SCRIPT_URL.
 *
 * Handles three message types:
 *   type = "request"  -> notify host of a new request
 *   type = "accept"   -> create real Meet link, email both parties
 *   type = "magic"    -> (optional) styled magic-link email if you route it here
 */

var APP_URL = "https://pm-exchange.vercel.app";
var BRAND = "PM Exchange";
var ACCENT = "#111111";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type || "request";

    if (type === "request") {
      MailApp.sendEmail({
        to: data.hostEmail,
        subject: data.bookerName + " requested a PM practice session",
        htmlBody: requestEmail(data),
        name: BRAND
      });
      return json({ ok: true });
    }

    if (type === "accept") {
      var meetLink = createMeetLink(data);
      MailApp.sendEmail({
        to: data.bookerEmail,
        subject: "Your session with " + data.hostName + " is confirmed",
        htmlBody: acceptedEmail(data, meetLink, true),
        name: BRAND
      });
      MailApp.sendEmail({
        to: data.hostEmail,
        subject: "You accepted " + data.bookerName + "'s request",
        htmlBody: acceptedEmail(data, meetLink, false),
        name: BRAND
      });
      return json({ ok: true, meetLink: meetLink });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function createMeetLink(data) {
  // Uses the Advanced Calendar Service to create an event WITH a Meet conference.
  var start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  var end = new Date(start.getTime() + 45 * 60 * 1000);

  var event = {
    summary: BRAND + ": " + data.bookerName + " and " + data.hostName,
    description: "PM Exchange practice session. Coordinate the exact time over WhatsApp.",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: [
      { email: data.bookerEmail },
      { email: data.hostEmail }
    ],
    conferenceData: {
      createRequest: {
        requestId: "pmx-" + new Date().getTime(),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    }
  };

  try {
    var created = Calendar.Events.insert(event, "primary", {
      conferenceDataVersion: 1,
      sendUpdates: "none"
    });
    if (created && created.hangoutLink) return created.hangoutLink;
    if (created && created.conferenceData && created.conferenceData.entryPoints) {
      var pts = created.conferenceData.entryPoints;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].entryPointType === "video") return pts[i].uri;
      }
    }
  } catch (err) {
    // Fall through to a safe default if anything goes wrong
  }
  return "https://meet.google.com/new";
}

/* ---------- Email templates ---------- */

function shell(innerHtml) {
  return '' +
  '<div style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
    '<div style="max-width:520px;margin:0 auto;padding:32px 16px;">' +
      '<div style="font-size:20px;font-weight:700;color:' + ACCENT + ';letter-spacing:-0.02em;margin-bottom:20px;">⇄ ' + BRAND + '</div>' +
      '<div style="background:#ffffff;border:1px solid #e6e6e6;border-radius:14px;padding:28px;">' +
        innerHtml +
      '</div>' +
      '<p style="font-size:12px;color:#9b9b9b;text-align:center;margin:20px 0 0;">You are receiving this because you are a member of ' + BRAND + '.</p>' +
    '</div>' +
  '</div>';
}

function button(href, label) {
  return '<a href="' + href + '" style="display:inline-block;background:' + ACCENT + ';color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;">' + label + '</a>';
}

function infoRow(label, value) {
  return '<tr>' +
    '<td style="padding:6px 0;font-size:13px;color:#9b9b9b;width:110px;">' + label + '</td>' +
    '<td style="padding:6px 0;font-size:13px;color:#111111;font-weight:500;">' + value + '</td>' +
  '</tr>';
}

function requestEmail(d) {
  var inner =
    '<h1 style="font-size:18px;color:#111;margin:0 0 6px;">New interview request</h1>' +
    '<p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 18px;">' +
      '<strong>' + d.bookerName + '</strong> would like to practice with you.' +
    '</p>' +
    (d.note ? '<div style="background:#f7f7f7;border-radius:8px;padding:12px 14px;font-size:13px;color:#555;font-style:italic;margin-bottom:18px;">"' + d.note + '"</div>' : '') +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:22px;">' +
      infoRow("From", d.bookerName) +
      infoRow("Email", d.bookerEmail) +
      (d.bookerWhatsapp ? infoRow("WhatsApp", d.bookerWhatsapp) : "") +
    '</table>' +
    button(APP_URL + "/sessions", "Review request") +
    '<p style="font-size:13px;color:#9b9b9b;margin:18px 0 0;line-height:1.6;">Open the Sessions tab to accept or decline. A credit is only used once you accept.</p>';
  return shell(inner);
}

function acceptedEmail(d, meetLink, toBooker) {
  var other = toBooker
    ? { name: d.hostName, email: d.hostEmail, wa: d.hostWhatsapp, role: "Interviewer" }
    : { name: d.bookerName, email: d.bookerEmail, wa: d.bookerWhatsapp, role: "Interviewee" };

  var headline = toBooker
    ? "Your session is confirmed"
    : "You accepted " + d.bookerName + "'s request";

  var inner =
    '<h1 style="font-size:18px;color:#111;margin:0 0 6px;">' + headline + '</h1>' +
    '<p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 18px;">' +
      (toBooker
        ? '<strong>' + d.hostName + '</strong> accepted your request. Details are below.'
        : 'Here are the details for your session with <strong>' + d.bookerName + '</strong>.') +
    '</p>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">' +
      infoRow(other.role, other.name) +
      infoRow("Email", other.email) +
      (other.wa ? infoRow("WhatsApp", other.wa) : "") +
    '</table>' +
    '<div style="background:#E1F5EE;border-radius:8px;padding:16px;margin-bottom:20px;">' +
      '<p style="font-size:12px;color:#0F6E56;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Google Meet</p>' +
      '<a href="' + meetLink + '" style="font-size:14px;color:#0F6E56;font-weight:600;word-break:break-all;">' + meetLink + '</a>' +
    '</div>' +
    button(meetLink, "Join Google Meet") +
    '<p style="font-size:13px;color:#9b9b9b;margin:18px 0 0;line-height:1.6;">' +
      'Coordinate the exact time over WhatsApp. ' +
      (toBooker ? '1 credit has been used for this session.' : 'Mark the session done in the app afterwards to earn +1 credit.') +
    '</p>';
  return shell(inner);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
