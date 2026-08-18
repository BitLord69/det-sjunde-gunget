/**
 * Brevo (Sendinblue) API Client Utility
 * Handles transactional email notifications and newsletter subscriber synchronization.
 */

interface SendEmailParams {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  replyTo?: { email: string; name?: string }
  sender?: { email: string; name?: string }
}

interface AddSubscriberParams {
  email: string
  attributes?: Record<string, any>
  listIds?: number[]
}

export async function sendTransactionalEmail(params: SendEmailParams) {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_CONTACT_EMAIL || 'kontakt@det7egunget.se'

  if (!apiKey) {
    console.warn('[Brevo] No BREVO_API_KEY configured. Skipping email dispatch.')
    return { success: false, reason: 'NO_API_KEY' }
  }

  const payload = {
    sender: params.sender || {
      name: 'Det 7:e Gunget',
      email: senderEmail,
    },
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    htmlContent: params.htmlContent,
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Brevo] Email dispatch failed:', response.status, errText)
      return { success: false, error: errText }
    }

    const data = await response.json()
    console.log('[Brevo] Email sent successfully:', data)
    return { success: true, messageId: data.messageId }
  } catch (error: any) {
    console.error('[Brevo] Network error during email dispatch:', error)
    return { success: false, error: error.message }
  }
}

export async function addOrUpdateContact(params: AddSubscriberParams) {
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) {
    console.warn('[Brevo] No BREVO_API_KEY configured. Skipping contact sync.')
    return { success: false, reason: 'NO_API_KEY' }
  }

  const payload: Record<string, any> = {
    email: params.email,
    updateEnabled: true,
  }

  if (params.attributes) {
    payload.attributes = params.attributes
  }
  if (params.listIds && params.listIds.length > 0) {
    payload.listIds = params.listIds
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      if (errData.code === 'duplicate_parameter') {
        console.log('[Brevo] Contact already exists in Brevo:', params.email)
        return { success: true, existing: true }
      }
      console.error('[Brevo] Contact creation failed:', response.status, errData)
      return { success: false, error: errData }
    }

    const data = await response.json()
    console.log('[Brevo] Contact added/updated:', data)
    return { success: true, contactId: data.id }
  } catch (error: any) {
    console.error('[Brevo] Contact sync network error:', error)
    return { success: false, error: error.message }
  }
}

export async function unsubscribeContact(email: string) {
  const apiKey = process.env.BREVO_API_KEY

  if (!apiKey) {
    console.warn('[Brevo] No BREVO_API_KEY configured. Skipping unsubscribe sync.')
    return { success: false, reason: 'NO_API_KEY' }
  }

  try {
    const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        emailBlacklisted: true,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Brevo] Contact unsubscribe failed:', response.status, errText)
      return { success: false, error: errText }
    }

    console.log('[Brevo] Contact successfully unsubscribed/blacklisted:', email)
    return { success: true }
  } catch (error: any) {
    console.error('[Brevo] Unsubscribe network error:', error)
    return { success: false, error: error.message }
  }
}
