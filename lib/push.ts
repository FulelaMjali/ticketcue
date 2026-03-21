import webpush, { PushSubscription } from 'web-push';

type SendPushOptions = {
  subscription: PushSubscription;
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@example.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendPush({ subscription, title, body, tag, data }: SendPushOptions) {
  ensureVapid();

  const payload = JSON.stringify({
    title,
    body,
    tag,
    data,
  });

  await webpush.sendNotification(subscription, payload);
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY;
}
