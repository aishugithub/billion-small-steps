# A Billion Small Steps: supplements site, one-time set-up

This folder is a small website, separate from Foothold. Teachers and students fill in a request form; each request lands in a Google Sheet; you approve it with one click and the right materials are e-mailed automatically.

- Page: `index.html` (+ `config.js`, `cover.png`, `qr-request.svg`)
- Backend: `Code.gs` (Google Apps Script, bound to a Google Sheet)
- Address once published: **https://aishugithub.github.io/billion-small-steps/** (the QR code in the book points to `…/#request`)

## 1. Put the materials in Google Drive (5 min)
1. In Drive, make a folder **ABSS – Teacher pack** and upload `A_Billion_Small_Steps_instructor.pdf` and `A_Billion_Small_Steps_Book.pdf` (both in `course_GPU\book`).
2. Make a folder **ABSS – Student pack** and upload `A_Billion_Small_Steps_Book.pdf`, plus a short document with the Foothold and Colab links.
3. For each folder: Share → General access → **Anyone with the link → Viewer** → Copy link. Keep the two links.
   (To stop a link working later, change the folder back to "Restricted" and make a new folder.)

## 2. Make the Sheet and paste the script (5 min)
1. Create a new Google Sheet called **ABSS – Requests**.
2. Extensions → Apps Script. Delete what is there, paste all of `Code.gs`, Save.
3. Back in the Sheet, reload the page. A menu **Supplements** appears.
4. Supplements → **1. Set up sheets** (allow the permissions it asks for). Two tabs appear: *Requests* and *Settings*.
5. In *Settings*, paste the teacher link into `TEACHER_PACK_LINK` and the student link into `STUDENT_PACK_LINK`. Check `NOTIFY_EMAIL` (where new-request alerts go).
6. Supplements → **2. Turn on automatic e-mails**. Optionally: Supplements → **Send me a test e-mail**.

## 3. Publish the script as a web app (3 min)
1. In Apps Script: **Deploy → New deployment → type: Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. Deploy, and copy the **Web app URL** (ends in `/exec`).
3. Paste it into `config.js` between the quotes: `window.SUPPLEMENTS_URL = "https://script.google.com/macros/s/…/exec";`
4. Later changes to `Code.gs`: Deploy → Manage deployments → edit → Version: **New version** (the URL stays the same).

## 4. Publish the page on GitHub Pages (5 min)
1. On github.com (account `aishugithub`): **New repository** → name **billion-small-steps** → Public → Create (no README).
2. In this folder (PowerShell):
   ```
   git init -b main
   git add .
   git commit -m "Supplements site for A Billion Small Steps"
   git remote add origin https://github.com/aishugithub/billion-small-steps.git
   git push -u origin main
   ```
3. On GitHub: repository → Settings → Pages → Source: **Deploy from a branch**, branch **main**, folder **/ (root)** → Save. After a minute the site is live at https://aishugithub.github.io/billion-small-steps/
4. Test: fill in the form as a "Student" with your own e-mail → a row appears in *Requests* and you get an alert → set Status to **Approve** → the student e-mail arrives and Status becomes **Sent**.

## Every day use
- A new request → you get an alert e-mail. Open the Sheet, check the person (for teachers, open the "Proof link"), and set **Status** to **Approve** or **Reject**. Approve sends the e-mail at once; nothing is ever sent twice.
- `AUTO_APPROVE_STUDENTS` = `yes` in *Settings* sends the student pack immediately, without waiting for you. Teachers always wait for your approval.
- Gmail limits: about 100 e-mails a day from a personal Google account (1,500 from Workspace). "Send e-mails for all approved rows now" in the menu catches up any that were missed.

## Privacy
The Sheet holds names and e-mails: keep it private (do not share it with "Anyone with the link"). The page says details are used only to send the materials and to know where the book is used.
