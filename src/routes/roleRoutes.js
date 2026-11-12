import { ROLE_NAV } from "../data/roleNav.js";
import { workerRoleOf } from "../data/employeeFields.js";

function pathsFor(role) {
  return [...new Set((ROLE_NAV[role] || []).flatMap((group) => group.items.flatMap((item) => [item.id, ...(item.alias || [])])))].map((path) => `/${path}`);
}

const employeeRoutes = [...pathsFor("emp"), "/calendar"];
const internRoutes = employeeRoutes.filter((path) => !["/finances", "/benefits-me"].includes(path));
const contingentRoutes = employeeRoutes.filter((path) => !["/finances", "/benefits-me", "/people"].includes(path));

export const ROLE_ROUTES = {
  employee: employeeRoutes,
  intern: internRoutes,
  contractor: contingentRoutes,
  freelancer: contingentRoutes,
  hr: [...pathsFor("admin"), "/calendar"],
  finance: [...pathsFor("admin"), "/calendar"],
  superadmin: [...pathsFor("superadmin"), "/calendar"],
};

export const APP_ROUTE_PATHS = [...new Set(Object.values(ROLE_ROUTES).flat())];

export function roleForUser(user) {
  if (user?.role === "emp") return workerRoleOf(user);
  if (user?.role === "admin") return user.modules?.includes("payroll") ? "finance" : "hr";
  return user?.role || "";
}
