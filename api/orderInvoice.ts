import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { TRPCError } from '@trpc/server'
import { and, eq, inArray } from 'drizzle-orm'
import { orderItems, orders, returns, sellers } from '../db/schema'
import { requireCustomerOwnership } from './customerOwnership'
import { getDb } from './queries/connection'

type InvoiceOrder = Pick<typeof orders.$inferSelect, 'code' | 'createdAt' | 'customerName' | 'address' | 'subtotal' | 'deliveryFee' | 'total' | 'paymentMethod' | 'paymentStatus' | 'status'>
type InvoiceItem = Pick<typeof orderItems.$inferSelect, 'name' | 'price' | 'qty' | 'size' | 'configuration' | 'sellerId'> & { sellerName?: string }
type ReturnCase = Pick<typeof returns.$inferSelect, 'status'>
export type OrderInvoice = { order: InvoiceOrder; items: InvoiceItem[]; returnCases: ReturnCase[] }

const orderStates: Record<string, string> = { placed: 'Placed', confirmed: 'Confirmed', pending_delivery: 'Preparing for delivery', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }
const paymentMethods: Record<string, string> = { cash: 'Cash on delivery', mtn_momo: 'MTN MoMo', airtel_money: 'Airtel Money' }
const money = (value: number) => `UGX ${value.toLocaleString('en-UG')}`
const date = (value: Date) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })

export function invoicePaymentLabel(order: Pick<InvoiceOrder, 'paymentStatus' | 'status'>) {
  if (order.paymentStatus === 'paid') return 'Payment confirmed'
  if (order.paymentStatus === 'pending_confirmation') return 'Awaiting payment verification'
  return order.status === 'cancelled' ? 'No payment recorded' : 'Unpaid'
}

// The new document path always requires the original account credential, even
// when the caller already knows the phone and order code used by tracking.
export async function loadOrderInvoice(req: Request, code: string, phone: string): Promise<OrderInvoice> {
  await requireCustomerOwnership(req, phone)
  const db = getDb()
  const [order] = await db.select().from(orders).where(and(
    eq(orders.code, code.trim().toUpperCase()),
    eq(orders.phone, phone.replace(/[\s-]+/g, '').trim()),
  )).limit(1)
  if (!order || order.phone.replace(/[\s-]+/g, '').trim() !== phone.replace(/[\s-]+/g, '').trim()) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found for this account.' })
  }

  const items = await db.select({ name: orderItems.name, price: orderItems.price, qty: orderItems.qty, size: orderItems.size, configuration: orderItems.configuration, sellerId: orderItems.sellerId })
    .from(orderItems).where(eq(orderItems.orderId, order.id))
  const sellerIds = [...new Set(items.flatMap(item => item.sellerId == null ? [] : [item.sellerId]))]
  // Shop names are public, but never select seller IDs, identity documents,
  // payment references, payout data or private registration contacts for a PDF.
  const shops = sellerIds.length ? await db.select({ id: sellers.id, shopName: sellers.shopName }).from(sellers).where(inArray(sellers.id, sellerIds)) : []
  const shopNames = new Map(shops.map(shop => [Number(shop.id), shop.shopName]))
  const returnCases = await db.select({ status: returns.status }).from(returns).where(eq(returns.orderId, order.id))
  return {
    order: { code: order.code, createdAt: order.createdAt, customerName: order.customerName, address: order.address, subtotal: order.subtotal, deliveryFee: order.deliveryFee, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, status: order.status },
    items: items.map(item => ({ ...item, sellerName: item.sellerId == null ? undefined : shopNames.get(Number(item.sellerId)) })),
    returnCases: returnCases.map(row => ({ status: row.status })),
  }
}

let fontBytes: Promise<[Buffer, Buffer]> | undefined
function invoiceFonts() {
  const root = path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/public/fonts' : 'public/fonts')
  return fontBytes ??= Promise.all([readFile(path.join(root, 'InvoiceSans.ttf')), readFile(path.join(root, 'InvoiceSans-Bold.ttf'))])
}

export async function createOrderInvoicePdf(invoice: OrderInvoice, generatedAt = new Date()) {
  const { order, items, returnCases } = invoice
  const amounts = [order.subtotal, order.deliveryFee, order.total, ...items.flatMap(item => [item.price, item.qty, item.price * item.qty])]
  if (amounts.some(amount => !Number.isSafeInteger(amount) || amount < 0)) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This order needs an amount review before an invoice can be downloaded. Please contact support.' })
  }
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  const [regularBytes, boldBytes] = await invoiceFonts()
  const regular = await document.embedFont(regularBytes, { subset: true })
  const bold = await document.embedFont(boldBytes, { subset: true })
  document.setTitle(`UGSouq order invoice ${order.code}`)
  document.setAuthor('UGSouq')
  document.setSubject('Marketplace order invoice and recorded payment status')
  document.setCreationDate(generatedAt)

  const ink = rgb(0.12, 0.16, 0.20)
  const muted = rgb(0.36, 0.40, 0.44)
  const green = rgb(0.05, 0.35, 0.27)
  const orange = rgb(0.95, 0.40, 0.09)
  const margin = 42
  const width = 595.28
  const height = 841.89
  const bottom = 64
  let page!: PDFPage
  let y = 0
  const characters = new Set(regular.getCharacterSet())
  const clean = (value: string) => [...String(value).replace(/\p{Cc}/gu, ' ')].map(ch => characters.has(ch.codePointAt(0)!) ? ch : '?').join('')
  const draw = (value: string, x: number, top: number, size = 9, font: PDFFont = regular, color = ink) => page.drawText(clean(value), { x, y: top, size, font, color })
  const right = (value: string, edge: number, top: number, size = 9, font: PDFFont = regular) => draw(value, edge - font.widthOfTextAtSize(clean(value), size), top, size, font)
  const wrap = (value: string, maxWidth: number, size = 9, font: PDFFont = regular) => {
    const lines: string[] = []
    let line = ''
    for (const word of clean(value).split(/\s+/).filter(Boolean)) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > maxWidth) { lines.push(line); line = '' }
      for (const ch of word) {
        if (font.widthOfTextAtSize(line + ch, size) > maxWidth && line) { lines.push(line); line = '' }
        line += ch
      }
      line += ' '
    }
    if (line.trim()) lines.push(line.trim())
    return lines.length ? lines : ['']
  }
  const newPage = () => {
    page = document.addPage([width, height])
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: orange })
    draw('UGSouq', margin, height - 52, 23, bold, green)
    draw('ORDER INVOICE', margin, height - 73, 9, bold, muted)
    right(order.code, width - margin, height - 49, 11, bold)
    right(`Order date: ${date(order.createdAt)}`, width - margin, height - 68, 8)
    y = height - 105
  }
  const ensure = (space: number) => { if (y - space < bottom) newPage() }
  const paragraph = (text: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    const size = options.size ?? 9
    for (const line of wrap(text, width - margin * 2, size, options.font)) {
      ensure(size + 5)
      draw(line, margin, y, size, options.font ?? regular, options.color ?? ink)
      y -= size + 5
    }
  }
  const tableHeading = () => {
    page.drawRectangle({ x: margin, y: y - 9, width: width - margin * 2, height: 24, color: rgb(0.94, 0.96, 0.95) })
    draw('ITEM / SELLER', margin + 8, y, 8, bold, green)
    right('QTY', 371, y, 8, bold)
    right('UNIT (UGX)', 454, y, 8, bold)
    right('TOTAL (UGX)', width - margin - 8, y, 8, bold)
    y -= 30
  }
  newPage()
  paragraph(`Customer: ${order.customerName}`, { font: bold })
  paragraph(`Delivery / collection: ${order.address}`)
  y -= 8
  paragraph(`Order status: ${orderStates[order.status] ?? order.status}`, { font: bold })
  paragraph(`Payment method: ${paymentMethods[order.paymentMethod] ?? order.paymentMethod}`)
  paragraph(`Original payment: ${invoicePaymentLabel(order)}`, { font: bold, color: green })
  if (order.status === 'cancelled') paragraph('CANCELLED ORDER - original order amounts are retained for your records.', { color: muted })
  if (returnCases.length) {
    paragraph(`Return / refund cases: ${[...new Set(returnCases.map(row => row.status.replaceAll('_', ' ')))].join(', ')}. The original payment status does not confirm a refund. Contact support for the separate refund confirmation.`, { color: muted })
  }
  y -= 20
  ensure(55)
  tableHeading()
  for (const item of items) {
    const name = wrap(item.name, 282, 9, bold)
    const details = [
      ...(item.size ? [`Size: ${item.size}`] : []),
      ...(item.configuration ? [item.configuration] : []),
      item.sellerName ? `Seller: ${item.sellerName}` : 'Seller name was not recorded for this order.',
    ].flatMap(value => wrap(value, 282, 8))
    const rows = [...name.map(text => ({ text, font: bold, size: 9 })), ...details.map(text => ({ text, font: regular, size: 8 }))]
    if (y - Math.min(rows.length, 4) * 13 - 14 < bottom) { newPage(); tableHeading() }
    right(String(item.qty), 371, y)
    right(item.price.toLocaleString('en-UG'), 454, y)
    right((item.price * item.qty).toLocaleString('en-UG'), width - margin - 8, y)
    for (const row of rows) {
      if (y - 14 < bottom) { newPage(); tableHeading(); draw('(item continued)', margin + 8, y, 8, regular, muted); y -= 15 }
      draw(row.text, margin + 8, y, row.size, row.font)
      y -= 13
    }
    y -= 7
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.88, 0.90, 0.89) })
    y -= 17
  }
  if (!items.length) paragraph('Item lines are unavailable for this older order. The saved totals are shown below.', { color: muted })
  ensure(110)
  const totalRow = (label: string, value: number, strong = false) => {
    draw(label, 340, y, strong ? 12 : 9, strong ? bold : regular)
    right(money(value), width - margin, y, strong ? 12 : 9, strong ? bold : regular)
    y -= strong ? 27 : 21
  }
  totalRow('Subtotal', order.subtotal)
  totalRow('Delivery', order.deliveryFee)
  // Any legacy difference is shown explicitly; never invent a discount or tax.
  const adjustment = order.total - order.subtotal - order.deliveryFee
  if (adjustment) totalRow('Order adjustment', adjustment)
  totalRow('Order total', order.total, true)
  y -= 12
  paragraph('Keep this document with your order records.', { font: bold })
  paragraph('This is a UGSouq marketplace order record, not a tax invoice. Original seller invoices and warranty documents are issued separately by the seller.', { size: 8, color: muted })
  paragraph('Item descriptions, configurations and amounts are taken from the saved order. Seller names reflect current shop records; no VAT, tax number or warranty entitlement is inferred.', { size: 8, color: muted })
  paragraph(`Payment and order status checked on ${date(generatedAt)}. Support: www.ugsouq.com/support`, { size: 8, color: muted })
  for (const [index, current] of document.getPages().entries()) {
    current.drawText(`UGSouq | ${order.code} | Page ${index + 1} of ${document.getPageCount()}`, { x: margin, y: 30, font: regular, size: 8, color: muted })
  }
  return document.save()
}
