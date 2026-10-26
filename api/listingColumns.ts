import { getTableColumns } from 'drizzle-orm'
import { listings } from '../db/schema'

// Catalog, search and advertisement queries do not need the full gallery blob.
export const listingCardColumns = Object.fromEntries(
  Object.entries(getTableColumns(listings)).filter(([name]) => name !== 'imageGallery'),
) as Omit<ReturnType<typeof getTableColumns<typeof listings>>, 'imageGallery'>
