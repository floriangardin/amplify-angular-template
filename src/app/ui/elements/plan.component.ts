import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PlanName } from '../../models/user';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule],
  template: `
      @if (planName() === 'pro') {
        <div class="flex flex-row">
          <span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-gray-900">
            ⭐PRO
          </span>
          @if(showCancel()) {
            <div class="text-sm underline ml-2 m-auto hover:text-gray-300 cursor-pointer" (click)="managePlan.emit()">Cancel subscription</div>
          }
        </div>
        }
      @if (planName() === 'pro_cancelling') {
        <div class="flex flex-row">
          <span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-gray-900">
            ⭐PRO (Cancelling)
          </span>
          @if(periodEnd()){
            <div class="text-sm ml-2 m-auto">Subscription active until {{ periodEnd() | date:'mediumDate' }}</div>
          }
          <div class="text-sm underline ml-2 m-auto hover:text-gray-300 cursor-pointer" (click)="cancelCancelSubscription.emit()">Reinstate subscription</div>
        </div>
        }
        @if (planName() === 'free') {
          <div class="flex flex-row">
              <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-gray-900">
                FREE
              </span>
              <div class="text-sm underline ml-2 m-auto hover:text-gray-300 cursor-pointer" (click)="goPro.emit()">Upgrade</div>
          </div>
        }
  `
})
export class PlanComponent {
    planName = input<PlanName>('free');
    goPro = output<void>();
    managePlan = output<void>();
    cancelCancelSubscription = output<void>();
    periodEnd = input<string | null>(null);
    showCancel = input<boolean>(false);
}
