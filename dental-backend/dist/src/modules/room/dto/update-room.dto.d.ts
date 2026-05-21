import { CreateRoomDto } from './create-room.dto.js';
declare const UpdateRoomDto_base: import("@nestjs/common").Type<Partial<CreateRoomDto>>;
export declare class UpdateRoomDto extends UpdateRoomDto_base {
}
export declare class UpdateRoomStatusDto {
    status: string;
}
export declare class AssignRoomDto {
    appointment_id?: string | null;
}
export {};
