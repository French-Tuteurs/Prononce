# Prononce

## Owner setup: deploying security rules

`firestore.rules` in this repo is the source of truth, but changing
it here does **not** automatically update the live project — deploy
it (Firebase CLI `firebase deploy --only firestore:rules` from a
checkout of this repo, or paste its contents into the **Rules** tab
under *Build → Firestore Database* in the Firebase console) every
time it changes, including after pulling this update. If recordings
aren't saving or the Messages feature says "permission denied," this
is almost always why: the rules in the console are still the old
ones.

Everything in this project runs on Firebase's free **Spark** plan —
no billing, no credit card. That's a deliberate constraint, not an
oversight: Firebase now requires upgrading to the paid **Blaze** plan
just to turn on Cloud Storage, even if actual usage stays at $0, so
this app doesn't use Cloud Storage at all. Audio recordings are
stored as a base64-encoded string directly on their own Firestore
document (`recordings/{id}.audioData`) instead of as Storage files —
each take is only a few tens of KB, far under Firestore's 1 MB
per-document limit, so this comfortably fits the free tier.

Owner Tools → **Send Message** (Owner Tools page) is the same story:
it delivers messages entirely inside the site via Firestore — no
email, no Resend, no Blaze plan, nothing to pay for or set up. Every
signed-in user reads their own messages on the site's **Messages**
page.
