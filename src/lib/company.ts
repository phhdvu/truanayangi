/** Default namespace used by the existing DST accounts and catalog. */
export const DEFAULT_COMPANY_CODE = "dst";

export function normalizeCompanyCode(value: string) {
  return value.trim().toLowerCase();
}
