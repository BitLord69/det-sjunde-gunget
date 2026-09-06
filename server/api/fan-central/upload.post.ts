import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../../db/client'
import { bannedEmails, fanSubmissions, siteSettings } from '../../db/schema'
import { sendDiscordFanPhotoAlert } from '../../utils/discord'

export default defineEventHandler(async (event) => {
  const multipartData = await readMultipartFormData(event)
  if (!multipartData || multipartData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ingen information skickades med formuläret.',
    })
  }

  // Extract fields
  let fileItem: any = null
  let email = ''
  let caption = ''
  let location = ''
  let takenWhen = ''
  let uploaderName = ''
  let rulesAccepted = false

  for (const item of multipartData) {
    const fieldName = item.name
    if (fieldName === 'file' && item.data && item.data.length > 0) {
      fileItem = item
    } else if (fieldName === 'email' && item.data) {
      email = item.data.toString('utf-8').trim().toLowerCase()
    } else if (fieldName === 'caption' && item.data) {
      caption = item.data.toString('utf-8').trim()
    } else if (fieldName === 'location' && item.data) {
      location = item.data.toString('utf-8').trim()
    } else if (fieldName === 'takenWhen' && item.data) {
      takenWhen = item.data.toString('utf-8').trim()
    } else if (fieldName === 'uploaderName' && item.data) {
      uploaderName = item.data.toString('utf-8').trim()
    } else if (fieldName === 'rulesAccepted' && item.data) {
      const val = item.data.toString('utf-8').trim()
      rulesAccepted = val === 'true' || val === '1' || val === 'on'
    }
  }

  // 1. Validation
  if (!email || !email.includes('@') || !email.includes('.')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Vänligen ange en giltig e-postadress.',
    })
  }

  if (!rulesAccepted) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Du måste intyga och acceptera villkoren för bildinnehåll.',
    })
  }

  if (!fileItem) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Vänligen välj en bildfil att ladda upp.',
    })
  }

  // 2. Check if email is banned
  const banned = await db
    .select()
    .from(bannedEmails)
    .where(eq(bannedEmails.email, email))
    .limit(1)

  if (banned.length > 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Denna e-postadress har spärrats från att ladda upp bilder eller skriva kommentarer.',
    })
  }

  // 3. Process image upload
  const originalName = fileItem.filename || 'fanphoto.jpg'
  const ext = path.extname(originalName).toLowerCase() || '.jpg'
  const safeFilename = `fan-${Date.now()}-${nanoid(6)}${ext}`
  let mediaUrl = ''

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`fan-central/${safeFilename}`, fileItem.data, {
        access: 'public',
        contentType: fileItem.type || 'image/jpeg',
      })
      mediaUrl = blob.url
    } catch (blobError: any) {
      console.warn('[Fan Upload] Vercel Blob upload failed, falling back to local storage:', blobError.message)
    }
  }

  if (!mediaUrl) {
    try {
      const uploadDir = path.resolve(process.cwd(), 'public/media/uploads')
      await fs.mkdir(uploadDir, { recursive: true })
      const filePath = path.join(uploadDir, safeFilename)
      await fs.writeFile(filePath, fileItem.data)
      mediaUrl = `/media/uploads/${safeFilename}`
    } catch (fsError: any) {
      console.error('[Fan Upload] Local save error:', fsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Kunde inte spara bildfilen på servern.',
      })
    }
  }

  // 4. Randomize visual rotation and fasteners for noticeboard
  const rotations = [-4, -3, -2, -1, 1, 2, 3, 4]
  const randomRotation = rotations[Math.floor(Math.random() * rotations.length)]
  const colors = ['red', 'gold', 'amber', 'blue', 'green']
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const submissionId = `fan-${nanoid(8)}`
  const now = new Date()

  // 5. Insert into staging table (fan_submissions with status 'pending')
  await db.insert(fanSubmissions).values({
    id: submissionId,
    mediaUrl,
    caption: caption || null,
    location: location || null,
    takenWhen: takenWhen || null,
    uploaderEmail: email,
    uploaderName: uploaderName || null,
    status: 'pending',
    rotation: randomRotation,
    fastenerType: 'pin',
    pinColor: randomColor,
    isMachineFan: false,
    createdAt: now,
    updatedAt: now,
  })

  // 6. Check Discord notification setting
  try {
    const settingsList = await db.select().from(siteSettings)
    const settingsMap: Record<string, string> = {}
    for (const s of settingsList) {
      settingsMap[s.key] = s.value
    }

    const discordWebhookUrl = settingsMap.discord_webhook_url
    const discordNotifyFanPhotos = settingsMap.discord_notify_fan_photos === 'true'

    if (discordWebhookUrl && discordNotifyFanPhotos) {
      const host = getRequestHeader(event, 'host') || 'www.det7egunget.se'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const adminUrl = `${protocol}://${host}/admin/fancentral`

      await sendDiscordFanPhotoAlert(
        discordWebhookUrl,
        {
          id: submissionId,
          email,
          name: uploaderName,
          caption,
          location,
          takenWhen,
          mediaUrl,
        },
        adminUrl,
      )
    }
  } catch (err: any) {
    console.error('[Fan Upload] Failed to send Discord notification:', err.message)
    // Non-fatal, do not fail the upload
  }

  return {
    success: true,
    message: 'Tack! Din bild har skickats in och granskas av bandet innan den nålas upp på tavlan.',
  }
})
