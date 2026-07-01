/**
 * Firebase Cloud Messaging (FCM) Integration
 *
 * SETUP:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Add a Web App to get your config (apiKey, authDomain, etc.)
 * 3. Generate a Server Key in Project Settings → Cloud Messaging
 * 4. Add to .env:
 *    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
 *    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourapp.firebaseapp.com
 *    NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourapp
 *    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourapp.appspot.com
 *    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
 *    NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
 *    FIREBASE_SERVER_KEY=AAAA... (server key for sending messages)
 *
 * 5. Install: npm install firebase-admin (already in package.json)
 *
 * USAGE (server-side):
 *   import { sendPushNotification, sendBulkPushNotification } from '@/lib/firebase/server'
 *   await sendPushNotification(userId, { title: 'Training Reminder', body: 'Tomorrow 10am' })
 */

export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

export const FIREBASE_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || ''

export function isFirebaseConfigured(): boolean {
  return !!FIREBASE_CONFIG.apiKey && !!FIREBASE_SERVER_KEY
}
