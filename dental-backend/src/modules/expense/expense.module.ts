import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller.js';
import { ExpenseService } from './expense.service.js';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
