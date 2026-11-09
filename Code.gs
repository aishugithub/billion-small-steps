/**
 * A Billion Small Steps: requests for the teaching materials.
 *
 * The web page (index.html) posts each request here. It lands in the "Requests" sheet with Status = Pending.
 * Aishu sets Status to "Approve" (or "Reject"); approving sends the right e-mail at once:
 *   Teacher -> the teacher pack link (Instructor's Answers + book), Student/Other -> the student pack link.
 * Links and settings live in the "Settings" sheet, so nothing in this file needs editing.
 *
 * One-time set-up: see SETUP.md. Menu: "Supplements" (appears after a reload of the Sheet).
 */

const REQ = 'Requests';
const SET = 'Settings';
const HEAD = ['Timestamp', 'Name', 'Email', 'Role', 'Institution', 'Department', 'Course / year', 'Proof link', 'Purpose', 'Page', 'Status', 'Sent at', 'Notes'];
const COL = Object.fromEntries(HEAD.map((h, i) => [h, i + 1]));   // header -> column number

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Supplements')
    .addItem('1. Set up sheets', 'setup')
    .addItem('2. Turn on automatic e-mails', 'installTrigger')
    .addSeparator()
    .addItem('Send e-mails for all approved rows now', 'sendAllApproved')
    .addItem('Send me a test e-mail', 'testEmail')
    .addToUi();
}

/** Creates the two sheets with their headers, the Status drop-down and the settings rows. Safe to run again. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const r = ss.getSheetByName(REQ) || ss.insertSheet(REQ);
  r.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#17324D').setFontColor('#FFFFFF');
  r.setFrozenRows(1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Approve', 'Reject', 'Sent'], true).build();
  r.getRange(2, COL['Status'], 1000, 1).setDataValidation(rule);
  const s = ss.getSheetByName(SET) || ss.insertSheet(SET);
  if (s.getLastRow() < 2) {
    s.getRange(1, 1, 7, 3).setValues([
      ['Setting', 'Value', 'What it is'],
      ['TEACHER_PACK_LINK', '', 'Google Drive link (Anyone with the link: Viewer) to the teacher folder: Instructor\'s Answers PDF + book PDF'],
      ['STUDENT_PACK_LINK', '', 'Google Drive link to the student folder: book PDF + links to the Colab labs'],
      ['FROM_NAME', 'Aishwarya S. (A Billion Small Steps)', 'The sender name on the e-mails'],
      ['NOTIFY_EMAIL', Session.getActiveUser().getEmail(), 'Where to send a note when a new request arrives (leave empty for none)'],
      ['AUTO_APPROVE_STUDENTS', 'no', 'yes = students get the student pack at once, without waiting for approval'],
      ['FOOTHOLD_LINK', 'https://aishugithub.github.io/course_GPU/', 'The Foothold course website'],
    ]);
    s.getRange(1, 1, 1, 3).setFontWeight('bold');
    s.setColumnWidth(2, 420); s.setColumnWidth(3, 520);
  }
  ss.toast('Sheets ready. Fill in the two links in Settings, then run step 2.', 'Supplements', 8);
}

/** Installable on-edit trigger: needed because a simple onEdit may not send e-mail. */
function installTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onStatusEdit').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Automatic e-mails are on: set a Status to "Approve" to send.', 'Supplements', 8);
}

function settings_() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SET);
  const out = {};
  s.getRange(2, 1, Math.max(1, s.getLastRow() - 1), 2).getValues().forEach(([k, v]) => { if (k) out[String(k).trim()] = String(v).trim(); });
  return out;
}

/** The web page posts here (form fields arrive in e.parameter). */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = (e && e.parameter) || {};
    if (p.website) return json_({ ok: true });                              // honeypot filled: a bot; ignore quietly
    const clean = v => String(v || '').replace(/^[=+\-@]/, "'").slice(0, 500); // stop formula injection, cap length
    const email = clean(p.email).toLowerCase();
    if (!p.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !p.role || !p.institution) return json_({ ok: false, error: 'missing fields' });
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REQ);
    const row = [new Date(), clean(p.name), email, clean(p.role), clean(p.institution), clean(p.department), clean(p.course),
                 clean(p.proof), clean(p.purpose), clean(p.page), 'Pending', '', ''];
    sh.appendRow(row);
    const n = sh.getLastRow();
    const st = settings_();
    if (st.NOTIFY_EMAIL) {
      MailApp.sendEmail(st.NOTIFY_EMAIL, `New book request: ${row[1]} (${row[3]}, ${row[4]})`,
        `${row[1]} <${row[2]}>\nRole: ${row[3]}\nInstitution: ${row[4]}\nDepartment: ${row[5]}\nCourse/year: ${row[6]}\nProof: ${row[7]}\nPurpose: ${row[8]}\n\nOpen the Requests sheet and set Status to Approve or Reject.`);
    }
    if (row[3] !== 'Teacher' && /^y/i.test(st.AUTO_APPROVE_STUDENTS || '')) sendRow_(sh, n);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return json_({ ok: true, service: 'A Billion Small Steps requests' }); }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Fires on any edit; acts only when a Status cell becomes "Approve". */
function onStatusEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== REQ || e.range.getColumn() !== COL['Status'] || e.range.getNumRows() !== 1) return;
  if (String(e.value || '').trim() === 'Approve') sendRow_(sh, e.range.getRow());
}

function sendAllApproved() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REQ);
  let n = 0;
  for (let r = 2; r <= sh.getLastRow(); r++) {
    if (String(sh.getRange(r, COL['Status']).getValue()).trim() === 'Approve' && !sh.getRange(r, COL['Sent at']).getValue()) { sendRow_(sh, r); n++; }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(`${n} e-mail(s) sent.`, 'Supplements', 6);
}

/** Sends the right pack for one row, once, and marks it Sent. */
function sendRow_(sh, r) {
  const v = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (v[COL['Sent at'] - 1]) return;                                        // never send twice
  const st = settings_();
  const teacher = v[COL['Role'] - 1] === 'Teacher';
  const link = teacher ? st.TEACHER_PACK_LINK : st.STUDENT_PACK_LINK;
  if (!link) { sh.getRange(r, COL['Notes']).setValue('Not sent: the ' + (teacher ? 'TEACHER' : 'STUDENT') + '_PACK_LINK is empty in Settings'); return; }
  const name = String(v[COL['Name'] - 1]).split(' ')[0] || 'there';
  const subject = teacher ? "A Billion Small Steps: instructor's materials" : 'A Billion Small Steps: your student materials';
  const body = teacher
    ? `Dear ${name},\n\nThank you for using A Billion Small Steps: How Your AI Really Runs, from the Maths to the Machine.\n\nYour teaching materials (the Instructor's Answers to every exercise and the book PDF) are here:\n${link}\n\nPlease keep the answers away from students. The Colab Core Labs and the interactive lessons are on the Foothold course website: ${st.FOOTHOLD_LINK}\n\nI would be glad to hear how the course goes, and about any mistakes you find.\n\nWith best wishes,\n${st.FROM_NAME}`
    : `Dear ${name},\n\nThank you for your interest in A Billion Small Steps: How Your AI Really Runs, from the Maths to the Machine.\n\nYour materials (the book PDF and links to the Colab labs) are here:\n${link}\n\nThe interactive lessons are on the Foothold course website: ${st.FOOTHOLD_LINK}\n\nHappy climbing!\n${st.FROM_NAME}`;
  MailApp.sendEmail({ to: v[COL['Email'] - 1], subject: subject, body: body, name: st.FROM_NAME });
  sh.getRange(r, COL['Sent at']).setValue(new Date());
  sh.getRange(r, COL['Status']).setValue('Sent');
}

function testEmail() {
  const me = Session.getActiveUser().getEmail();
  MailApp.sendEmail(me, 'Supplements test', 'If you can read this, the script can send e-mail from your account.');
  SpreadsheetApp.getActiveSpreadsheet().toast('Test e-mail sent to ' + me, 'Supplements', 6);
}
