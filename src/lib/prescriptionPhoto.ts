import { PRESCRIPTION_MAX_BYTES } from './healthcarePolicy'
// Local camera/gallery preparation only: remove metadata and reduce upload size.
export async function preparePrescriptionPhoto(file: File) {
  if (!['image/jpeg','image/png'].includes(file.type) || file.size > 12_000_000) throw new Error('Choose a JPG or PNG photo under 12 MB.')
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image(); image.src = objectUrl; await image.decode()
    if (image.naturalWidth < 100 || image.naturalHeight < 100 || image.naturalWidth > 12_000 || image.naturalHeight > 12_000) throw new Error('Choose a clear photo with readable text.')
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d'); if (!context) throw new Error('This browser cannot prepare the photo. Try another browser.')
    context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height)
    for (const quality of [0.85,0.7,0.55]) {
      const data = canvas.toDataURL('image/jpeg', quality)
      if (Math.ceil((data.length - data.indexOf(',') - 1) * 3 / 4) <= PRESCRIPTION_MAX_BYTES) return data
    }
    throw new Error('This photo is too large after processing. Crop to the prescription and try again.')
  } finally { URL.revokeObjectURL(objectUrl) }
}
