"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = paginate;
function paginate(data, total, page, limit) {
    return {
        data,
        meta: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    };
}
//# sourceMappingURL=paginated-result.interface.js.map