"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdmin = exports.IS_SUPER_ADMIN_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_SUPER_ADMIN_KEY = 'isSuperAdmin';
const SuperAdmin = () => (0, common_1.SetMetadata)(exports.IS_SUPER_ADMIN_KEY, true);
exports.SuperAdmin = SuperAdmin;
//# sourceMappingURL=super-admin.decorator.js.map