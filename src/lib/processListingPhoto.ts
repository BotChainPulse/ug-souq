import { MAX_NEW_PHOTO_LENGTH } from './listingPhotos'

export function processListingPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('Choose JPG, PNG or WebP photos.'))
  if (file.size > 20 * 1024 * 1024) return Promise.reject(new Error('Choose a photo smaller than 20 MB.'))
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    const timer = window.setTimeout(() => finish(new Error('Photo processing timed out. Choose another photo.')), 30_000)
    let finished = false
    function finish(error?: Error, data?: string) {
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve(data!)
    }
    img.onload = () => {
      try {
        const size = 800, padding = 32
        const scale = Math.min(1, (size - padding * 2) / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale)), height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Photo processing is unavailable in this browser.')
        ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height)
        let format = 'image/webp', quality = 0.82
        let data = canvas.toDataURL(format, quality)
        if (!data.startsWith('data:image/webp')) { format = 'image/jpeg'; data = canvas.toDataURL(format, quality) }
        while (data.length > MAX_NEW_PHOTO_LENGTH && quality > 0.3) {
          quality -= 0.1; data = canvas.toDataURL(format, quality)
        }
        if (data.length > MAX_NEW_PHOTO_LENGTH) throw new Error('This photo is too detailed to save. Choose a smaller photo.')
        finish(undefined, data)
      } catch (error) { finish(error instanceof Error ? error : new Error('Could not process this photo.')) }
    }
    img.onerror = () => finish(new Error('This photo could not be opened. Choose another image.'))
    img.src = url
  })
}
