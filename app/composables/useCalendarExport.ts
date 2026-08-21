export interface CalendarGig {
  id?: string
  date: number | string | Date
  venue: string
  city: string
  ticketUrl?: string | null
  status?: string | null
  notesSv?: string | null
  notesEn?: string | null
}

export function useCalendarExport() {
  const { locale } = useI18n()

  const getGoogleCalendarUrl = (gig: CalendarGig) => {
    const d = new Date(gig.date)
    const startTime = d.toISOString().replace(/-|:|\.\d\d\d/g, '')
    // 3 hours duration standard for evening gigs
    const endDate = new Date(d.getTime() + 3 * 60 * 60 * 1000)
    const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '')

    const isEn = locale.value === 'en'
    const title = encodeURIComponent(`Det 7:e Gunget live @ ${gig.venue}`)
    const noteText = isEn && gig.notesEn ? gig.notesEn : (gig.notesSv || gig.notesEn || '')
    const ticketText = gig.ticketUrl && gig.ticketUrl !== '#'
      ? `${isEn ? 'Tickets' : 'Biljetter'}: ${gig.ticketUrl}`
      : (gig.status === 'free' ? (isEn ? 'Free entry' : 'Fri entré') : (isEn ? 'Tickets at door' : 'Biljetter i dörren'))

    const details = encodeURIComponent(
      `Det 7:e Gunget — Blues & Rock live\n\n${noteText}\n${ticketText}\n\nhttps://www.det7egunget.se`
    )
    const location = encodeURIComponent(`${gig.venue}, ${gig.city}`)

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`
  }

  const generateIcsContent = (gig: CalendarGig) => {
    const d = new Date(gig.date)
    const endDate = new Date(d.getTime() + 3 * 60 * 60 * 1000)
    const now = new Date()

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '')
    }

    const isEn = locale.value === 'en'
    const noteText = isEn && gig.notesEn ? gig.notesEn : (gig.notesSv || gig.notesEn || '')
    const ticketText = gig.ticketUrl && gig.ticketUrl !== '#'
      ? `Tickets: ${gig.ticketUrl}`
      : (gig.status === 'free' ? 'Free entry' : 'Tickets at door')

    const uid = `gig-${gig.id || Date.now()}@det7egunget.se`
    const summary = `Det 7:e Gunget live @ ${gig.venue}`
    const description = `Det 7:e Gunget — Blues & Rock live\\n\\n${noteText}\\n${ticketText}\\n\\nhttps://www.det7egunget.se`
    const location = `${gig.venue}, ${gig.city}`

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Det 7:e Gunget//Band Gigs Calendar//SV',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(d)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
  }

  const downloadIcsFile = (gig: CalendarGig) => {
    if (import.meta.server) return
    const icsContent = generateIcsContent(gig)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const dateStr = new Date(gig.date).toISOString().split('T')[0]
    const cleanVenue = gig.venue.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const filename = `det-7e-gunget-${cleanVenue}-${dateStr}.ics`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    getGoogleCalendarUrl,
    downloadIcsFile,
  }
}
