const permissions = {
  owner: new Set(["read", "catalog:write", "setup:write", "members:write", "generation:request"]),
  editor: new Set(["read", "catalog:write", "generation:request"]),
  analyst: new Set(["read"]),
  operator: new Set(["read", "catalog:write", "setup:write", "members:write", "generation:request"]),
};

export function hasRolePermission(role, permission) {
  return permissions[role]?.has(permission) === true;
}

export function membershipAllowsShop(membership, requestedShopId, permission) {
  return Boolean(membership)
    && membership.shopId === requestedShopId
    && hasRolePermission(membership.role, permission);
}
