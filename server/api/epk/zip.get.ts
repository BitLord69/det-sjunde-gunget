import fs from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import JSZip from 'jszip'
import { db } from '../../db/client'
import { epkDocuments, galleryItems, siteSettings } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const zip = new JSZip()

  // 1. Fetch active EPK press photos
  const photos = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.isEpk, true))

  // 2. Fetch active EPK documents
  const docs = await db
    .select()
    .from(epkDocuments)
    .where(eq(epkDocuments.isActive, true))

  // 3. Fetch notification email from site_settings
  let contactEmail = 'info@det7egunget.se'
  try {
    const settingsList = await db.select().from(siteSettings)
    const emailSetting = settingsList.find(s => s.key === 'notification_email')?.value
    if (emailSetting) {
      contactEmail = emailSetting.split(/[,;]/)[0]?.trim() || contactEmail
    }
  } catch (_) {}

  // Folders inside the zip
  const photosFolder = zip.folder('Pressfoton-HighRes')
  const logosFolder = zip.folder('Logotyper-Grafik')
  const docsFolder = zip.folder('Arrangorsdokument-PDF')

  // Helper to load file buffer from local public dir or remote URL
  const loadFileBuffer = async (fileUrl: string): Promise<Buffer | null> => {
    try {
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const res = await fetch(fileUrl)
        if (!res.ok) return null
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
      }

      // Local file in /public/
      const cleanPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl
      const localPath = path.resolve(process.cwd(), 'public', cleanPath)
      return await fs.readFile(localPath)
    } catch (err: any) {
      console.warn(`[EPK Zip] Could not read file ${fileUrl}:`, err?.message)
      return null
    }
  }

  // Add photos
  if (photosFolder) {
    for (const [index, p] of photos.entries()) {
      const buf = await loadFileBuffer(p.mediaUrl)
      if (buf) {
        const ext = path.extname(p.mediaUrl) || '.jpg'
        const safeTitle = (p.epkTitleSv || p.captionSv || `Bandfoto-${index + 1}`)
          .replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, '')
          .trim()
        photosFolder.file(`${index + 1}-${safeTitle}${ext}`, buf)
      }
    }
  }

  // Add official band logos
  const brandLogos = [
    { name: 'Det-7e-Gunget-Logotyp-Cirkel.webp', path: '/media/brand/Logotyp.webp' },
    { name: 'Det-7e-Gunget-Logotyp-Badge.webp', path: '/media/brand/Logotyp_mini.webp' },
  ]

  if (logosFolder) {
    for (const logo of brandLogos) {
      const buf = await loadFileBuffer(logo.path)
      if (buf) {
        logosFolder.file(logo.name, buf)
      }
    }
  }

  // Add documents
  if (docsFolder) {
    for (const [index, d] of docs.entries()) {
      const buf = await loadFileBuffer(d.fileUrl)
      if (buf) {
        const ext = path.extname(d.fileUrl) || `.${d.fileType || 'pdf'}`
        const safeTitle = d.titleSv.replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, '').trim()
        docsFolder.file(`${index + 1}-${safeTitle}${ext}`, buf)
      }
    }
  }

  // Add README text file
  const readmeContent = `=====================================================
DET 7:e GUNGET — OFFICIELLT ARRANGÖRS- & PRESSKIT (EPK)
=====================================================

Webbplats: https://det7egunget.se
Arrangörssida: https://det7egunget.se/epk
Bokning & Kontakt: ${contactEmail}

OM BANDET:
Det 7:e Gunget levererar tung gungande bluesrock med svängig soul,
fett munspel, distad Hammond och ett sound som träffar rakt i magen.
4 erfarna musiker med rötterna i 60- och 70-talets råa bluespuls!

MEDLEMMAR:
- Janis: Huvudsång & Munspel
- Marcus: Elgitarr & Körsång
- Bosse: Bas & Körsång
- Jonas: Trumset

BILD- & MATERIALRÄTTIGHETER:
Samtliga bilder och logotyper i detta pressarkiv är godkända för fri
användning vid marknadsföring av bandets spelningar och recensioner/press.
Vid publicering av pressfoton, ange gärna:
"Foto: Det 7:e Gunget"

INNEHÅLL I DETTA ARKIV:
- /Pressfoton-HighRes/ : Högupplösta press- och bandfoton (300 DPI)
- /Logotyper-Grafik/   : Officiella högupplösta logotyper för affischer & tryck
- /Arrangorsdokument-PDF/ : Tryckfärdiga affischer och tekniska bilagor

För tekniska frågor, scenplot och patchlista (13 kanaler), besök:
https://det7egunget.se/epk
`
  zip.file('README-Presskit.txt', readmeContent)

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `Det-7e-Gunget-Komplett-Presskit-${dateStr}.zip`

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': zipBuffer.length.toString(),
    'Cache-Control': 'no-cache',
  })

  return zipBuffer
})
