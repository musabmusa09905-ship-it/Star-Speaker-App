export function isAdmin(profile) {
  return profile?.role === "admin";
}

export function isCoordinator(profile) {
  return profile?.role === "coordinator";
}

export function isAdminLike(profile) {
  return isAdmin(profile) || isCoordinator(profile);
}

export function canManageUsers(profile) {
  return isAdminLike(profile);
}

export function canCreateRole(actorProfile, role) {
  if (isAdmin(actorProfile)) {
    return ["student", "teacher", "coordinator"].includes(role);
  }

  if (isCoordinator(actorProfile)) {
    return role === "student";
  }

  return false;
}

export function canManageTeacherLinks(profile) {
  return isAdminLike(profile);
}

export function canUseStaffLevelDetails(profile) {
  return ["admin", "coordinator", "teacher"].includes(profile?.role);
}
