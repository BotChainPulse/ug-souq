import { describe, expect, it } from 'vitest';
import { accountAfterCheckout } from '../src/lib/account';
const secured = { name: 'Synthetic buyer', phone: '0700 000-001', email: 'buyer@example.test', location: 'Test location', deletionToken: 'a'.repeat(43) };
const details = { name: 'Synthetic buyer', phone: '0700000001', email: 'updated@example.test', location: 'New test location' };
describe('checkout account credentials', () => {
 it('preserves the original-device credential through checkout for the same buyer', () => {
  expect(accountAfterCheckout(secured, details)).toEqual({ ...details, deletionToken: secured.deletionToken });
 });
 it('never attaches a buyer credential to checkout for another phone', () => {
  expect(accountAfterCheckout(secured, { ...details, phone: '0700000002' }).deletionToken).toBeUndefined();
  expect(accountAfterCheckout(null, details).deletionToken).toBeUndefined();
 });
});
