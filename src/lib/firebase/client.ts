/**
 * Firebase Client SDK — Browser-side FCM token registration
 *
 * USAGE:
 *   import { requestNotificationPermission, getFCMToken } from '@/lib/firebase/client'
 *
 *   // On app load (in a useEffect):
 *   const token = await requestNotificationPermission()
 *   if (token) {
 *     await fetch('/api/notifications/fcm/register', {
 *       method: 'POST',
 *       body: JSON.stringify({ token, platform: 'web' })
 *     })
 *   }
 */

import { FIREBASE_CONFIG, isFirebaseConfigured } from './config'

/**
 * Request notification permission from the browser.
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[FCM] This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Get the FCM registration token for this device.
 * Requires firebase npm package: npm install firebase
 *
 * For now, this uses the browser's Push API (Service Worker) as a fallback.
 * When Firebase is configured, it uses Firebase Messaging.
 */
export async function getFCMToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase not configured — using browser Push API fallback')
    return getBrowserPushToken()
  }

  try {
    // Dynamic import — only loads Firebase if the package is installed
    // npm install firebase (required for FCM)
    // @ts-ignore — firebase types are optional (package may not be installed yet)
    const firebaseApp = await import('firebase/app').catch(() => null)
    // @ts-ignore — firebase types are optional
    const firebaseMessaging = await import('firebase/messaging').catch(() => null)

    if (!firebaseApp || !firebaseMessaging) {
      console.warn('[FCM] Firebase package not installed. Run: npm install firebase')
      return getBrowserPushToken()
    }

    const { initializeApp } = firebaseApp
    const { getMessaging, getToken, onMessage } = firebaseMessaging

    const app = initializeApp(FIREBASE_CONFIG)
    const messaging = getMessaging(app)

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
    })

    // Listen for incoming messages when app is in foreground
    onMessage(messaging, (payload: any) => {
      console.log('[FCM] Message received:', payload)
      if (payload.notification) {
        new Notification(payload.notification.title || 'Agrobase', {
          body: payload.notification.body || '',
          icon: '/icon-192.png',
        })
      }
    })

    return token
  } catch (error) {
    console.error('[FCM] Failed to get token:', error)
    return getBrowserPushToken()
  }
}

/**
 * Browser Push API fallback (no Firebase needed).
 * Uses Service Worker + Push API for basic push notifications.
 */
async function getBrowserPushToken(): Promise<string | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    return subscription.endpoint
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error)
    return null
  }
}

/**
 * Convenience: Request permission + get token + register with server
 */
export async function setupPushNotifications(): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) return false

  const token = await getFCMToken()
  if (!token) return false

  try {
    await fetch('/api/notifications/fcm/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: 'web' }),
    })
    return true
  } catch (error) {
    console.error('[FCM] Failed to register token with server:', error)
    return false
  }
}
