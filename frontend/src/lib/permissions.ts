export type Role = "owner" | "accountant" | "staff";

export function canWriteSuppliers(role?: Role) {
  return role === "owner" || role === "accountant";
}

export function canWriteFinance(role?: Role) {
  return role === "owner" || role === "accountant";
}

export function canManageUsers(role?: Role) {
  return role === "owner";
}

export function canManageSettings(role?: Role) {
  return role === "owner";
}

export function canBackup(role?: Role) {
  return role === "owner";
}

export function canExport(role?: Role) {
  return role === "owner" || role === "accountant";
}
