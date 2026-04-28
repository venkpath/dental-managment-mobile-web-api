"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDentistScope = applyDentistScope;
exports.isDentistUser = isDentistUser;
function isClinicalRole(role) {
    if (typeof role !== 'string')
        return false;
    const normalized = role.trim().toLowerCase();
    return normalized === 'dentist' || normalized === 'consultant';
}
function applyDentistScope(query, user) {
    if (!user)
        return query;
    if (isClinicalRole(user.role)) {
        query.dentist_id = user.sub;
    }
    return query;
}
function isDentistUser(user) {
    return !!user && isClinicalRole(user.role);
}
//# sourceMappingURL=dentist-scope.util.js.map