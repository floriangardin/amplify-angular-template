import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Email } from '../../../../models/email';
import { marked } from 'marked';

@Component({
  selector: 'app-email-list-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="p-3 rounded-lg mb-2 cursor-pointer hover:bg-primary-100 transition-all relative overflow-hidden"
      [class.bg-primary-100]="isSelected()"
      [class.bg-white]="!isSelected()"
      [class.border-l-4]="email().isUrgent"
      [class.border-secondary-600]="email().isUrgent"
      (click)="emailClick.emit(email())"
    >
      <div class="flex justify-between items-center gap-2 min-w-0">
        <span class="font-semibold text-sm truncate flex-1 min-w-0">{{ email().title }}</span>
        <span 
          class="text-xs text-white px-2 py-0.5 rounded-full uppercase font-medium whitespace-nowrap flex-shrink-0"
          [ngClass]="getCategoryClass(email().category)"
        >
          {{getCategoryText(email().category)}}
        </span>
      </div>
      <div class="text-xs text-gray-500 truncate">{{ email().sender }}</div>
      <div class="text-sm text-gray-500 truncate" [innerHTML]="renderedHtml()"></div>
    </div>
  `
})
export class EmailListItemComponent {
  email = input.required<Email>();
  isSelected = input<boolean>(false);
  
  emailClick = output<Email>();

  getPreview(content: string): string {
    const first = content.split('\n')[0];
    const name = 'player';
    return name ? first.replace(/\{first_name\}/g, name) : first;
  }

  renderedHtml = computed(() => {
    const raw = this.getPreview(this.email().content).split('\n')[0].split('<br/>')[0];
    if (!raw) return '';
    return marked.parse(raw, { breaks: true }) as string;
  });

  getCategoryText(category: Email['category']): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  getCategoryClass(category: Email['category']): string {
    const classes: Record<Email['category'], string> = {
      'scenario': 'bg-secondary-500',
      'sales_support': 'bg-primary-500',
      'culture': 'bg-amber-500',
      'gdpr': 'bg-purple-600',
      'hr': 'bg-green-600',
      'misc': 'bg-slate-600',
      'informatica': 'bg-blue-600',
      'strategy': 'bg-orange-600'
    };
    return classes[category] || 'bg-primary-400';
  }
}
