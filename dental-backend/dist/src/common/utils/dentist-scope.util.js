"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDentistScope = applyDentistScope;
exports.isDentistUser = isDentistUser;
function applyDentistScope(query, user) {
    if (!user)
        return query;
    if (typeof user.role === 'string' && user.role.trim().toLowerCase() === 'dentist') {
        query.dentist_id = user.sub;
    }
    return query;
}
function isDentistUser(user) {
    return !!user && typeof user.role === 'string' && user.role.trim().toLowerCase() === 'dentist';
}
//# sourceMappingURL=dentist-scope.util.js.map