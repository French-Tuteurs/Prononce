# Prononce

## Owner setup: deploying security rules

`firestore.rules` and `storage.rules` in this repo are the source of
truth, but changing either file here does **not** automatically
update the live project — deploy them (Firebase CLI
`firebase deploy --only firestore:rules,storage` from a checkout of
this repo, or paste each file's contents into the matching Rules tab
in the Firebase console) every time either file changes, including
after pulling this update. **Both files changed in this update** —
if recordings aren't uploading or the new Messages feature says
"permission denied," this is almost always why: the rules in the
console are still the old ones.

Also check, once, that **Storage is actually turned on** for this
project: Firebase console → *Build* → *Storage* → if it still shows
a "Get started" button instead of a file browser, click it and
accept the default settings. A `storageBucket` value already being
present in the app's config does not mean the Storage product itself
has been enabled.

Owner Tools → **Send Message** (Owner Tools page) delivers messages
entirely inside the site — no email, no Resend, no Firebase Blaze
plan, nothing to pay for or set up. It writes to a Firestore
`messages` collection and every signed-in user reads their own
messages on the site's **Messages** page.