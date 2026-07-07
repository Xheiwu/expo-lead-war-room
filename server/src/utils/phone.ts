export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidChinaMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(normalizePhone(phone));
}
