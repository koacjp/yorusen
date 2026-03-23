import type { CastProfile, Customer } from './types';

const CAST_PROFILE_KEY = 'yorusen_cast_profile';
const CUSTOMERS_KEY = 'yorusen_customers';

export function getCastProfile(): CastProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CAST_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CastProfile;
  } catch {
    return null;
  }
}

export function saveCastProfile(profile: CastProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CAST_PROFILE_KEY, JSON.stringify(profile));
}

export function getCustomers(): Customer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Customer[];
  } catch {
    return [];
  }
}

export function saveCustomer(customer: Customer): void {
  if (typeof window === 'undefined') return;
  const customers = getCustomers();
  const existing = customers.findIndex((c) => c.id === customer.id);
  if (existing >= 0) {
    customers[existing] = customer;
  } else {
    customers.push(customer);
  }
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

export function deleteCustomer(id: string): void {
  if (typeof window === 'undefined') return;
  const customers = getCustomers().filter((c) => c.id !== id);
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}
