#!/usr/bin/env node
/**
 * Generate VAPID keys for web push.
 * Usage: node generate-vapid.js
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env.local or .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:support@example.com\n`);
console.log('(Replace support@example.com with a real email address)\n');
