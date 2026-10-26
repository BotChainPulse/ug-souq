import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ProductGallery from './ProductGallery'
import ListingPhotoEditor from './ListingPhotoEditor'
const images = Array.from({ length: 6 }, (_, index) => `/images/synthetic-photo-${index}.png`)

describe('gallery and photo editor rendering', () => {
  it('provides accessible thumbnails, previous/next controls and a six-photo count', () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { images, name: 'Synthetic item' }))
    expect(html).toContain('Photo 1 of 6'); expect(html).toContain('aria-label="Next photo"'); expect(html).toContain('aria-label="Previous photo"')
    expect(html.match(/aria-label="Show photo /g)).toHaveLength(6)
    expect(html).toContain('aria-pressed="true"')
  })
  it('keeps single-photo products simple without gallery navigation', () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { images: [images[0]], name: 'Synthetic item' }))
    expect(html).not.toContain('Next photo'); expect(html).toContain('alt="Synthetic item"')
  })
  it('supports multi-select, a separate camera input and removal/main-photo controls', () => {
    const html = renderToStaticMarkup(createElement(ListingPhotoEditor, { value: images.slice(0, 2), onChange: () => undefined }))
    expect(html).toContain('multiple=""'); expect(html).toContain('capture="environment"')
    expect(html).toContain('Make photo 2 the main photo'); expect(html).toContain('Remove photo 1')
    const full = renderToStaticMarkup(createElement(ListingPhotoEditor, { value: images, onChange: () => undefined }))
    expect(full).toContain('6/6'); expect(full).not.toContain('type="file"')
  })
})
