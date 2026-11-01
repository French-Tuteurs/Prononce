# Prononce

## Owner setup: sending email (one-time)

Owner Tools → Send Email queues messages in a Firestore `mail`
collection; actually delivering them needs Firebase's **Trigger
Email** extension, connected to **Resend**. Neither is set up by
default — until you do this once, queued messages will just sit in
`mail` and never go out.

1. **Upgrade to the Blaze plan.** Firebase console → your project →
   gear icon → *Usage and billing* → *Modify plan*. Extensions need
   this; at the volume a small project sends, you'll likely stay
   within the free monthly allowances Blaze still includes.
2. **Create a Resend account** at [resend.com](https://resend.com)
   (free tier is generous for this). Verify a sending domain (or use
   their test domain while trying things out), then go to
   *API Keys* → create one, and note the **SMTP** connection details
   Resend shows you (host `smtp.resend.com`, port `465`, username
   `resend`, password = your API key).
3. **Install the extension.** Firebase console → *Extensions* →
   *Browse all extensions* → search **"Trigger Email"**
   (`firebase/firestore-send-email`) → Install.
4. **During setup, set:**
   - **Collection path:** `mail` (matches what `admin-email.js`
     writes to — don't change this unless you also update that file).
   - **SMTP connection URI:**
     `smtps://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465`
   - **Default FROM address:** an address on the domain you verified
     with Resend (e.g. `no-reply@yourdomain.com`).
   - Leave the other fields at their defaults unless you know you
     need something different.
5. **Deploy**, then test: use Owner Tools → Send Email to send
   yourself a message. It should arrive within a minute or two. If it
   doesn't, check the extension's Cloud Function logs in the Firebase
   console for the actual delivery error (most often an unverified
   Resend domain or a typo in the SMTP URI).

This only needs to be done once per Firebase project.


## Owner setup: deploying security rules

`firestore.rules` and `storage.rules` in this repo are the source of
truth, but changing either file here does **not** automatically
update the live project — deploy them the same way you already do
(Firebase CLI `firebase deploy --only firestore:rules,storage` from a
checkout of this repo, or paste each file's contents into the
matching Rules tab in the Firebase console) whenever either file
changes.