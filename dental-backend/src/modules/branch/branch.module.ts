import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';

@Module({
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
