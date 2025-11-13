import { Component, EventEmitter, Input, OnInit, Output, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseCDOComponent } from './base.component';

@Component({
  selector: 'app-bestcdo-choice',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="min-h-screen min-w-screen bg-transparent flex items-center justify-center flex flex-col p-4">
    <div class="max-w-4xl w-full bg-white shadow-lg rounded-lg md:m-6 p-8 flex flex-col items-center gap-6">

      <!-- Header -->
      <div class="text-center">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          <span class="text-primary-600">Data Governance Roles</span> Simulator
        </h1>
        <p class="text-lg md:text-xl text-gray-600">
          Engage your team in real-life data governance challenges.
        </p>
      </div>

      <!-- Roles Selection -->
      <div class="w-full mt-4">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 text-center">
          Select Your Role
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (role of roles; track role.name) {
            <div 
              class="flex flex-col items-center p-6 rounded-lg border-2 transition-all cursor-pointer"
              [ngClass]="{
                'border-primary-500 bg-primary-50 hover:bg-primary-100 hover:shadow-md': role.enabled,
                'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60': !role.enabled
              }"
              (click)="onRoleSelect(role)"
              [attr.aria-disabled]="!role.enabled"
            >
              <!-- Role Image -->
              <div class="w-24 h-24 mb-4 flex items-center justify-center">
                <img 
                  [src]="role.image" 
                  [alt]="role.name"
                  class="w-full h-full object-contain"
                  [ngClass]="{'grayscale': !role.enabled}"
                />
              </div>

              <!-- Role Name -->
              <h3 class="text-xl font-bold text-gray-900 mb-2 text-center">
                {{ role.name }}
              </h3>

              <!-- Role Description -->
              <p class="text-sm text-gray-600 text-center mb-3">
                {{ role.description }}
              </p>

              <!-- Status Badge -->
              @if (role.enabled) {
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Available
                </span>
              } @else {
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                  Available in Full Version
                </span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Marketing Disclaimer -->
      <div class="w-full mt-6 p-6 bg-gradient-to-r from-primary-50 to-primary-200 rounded-lg border border-primary-200">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-1">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              🚀 Full Version Features
            </h3>
            <p class="text-sm text-gray-700 leading-relaxed">
              This is a demo version. The <strong>full version</strong> includes access to <strong>multiple roles</strong> 
              (Data Steward, Data Owner, Data Sponsor) with <strong>several unique & longer scenarios</strong> 
              for each role. Experience comprehensive data governance challenges tailored to every position in your organization.
            </p>
            <div class="mt-3 flex gap-2 text-xs text-gray-600">
              <span class="inline-flex items-center">
                ✓ 3+ Data governance Roles
              </span>
              <span class="inline-flex items-center">
                ✓ 10+ Unique Scenarios
              </span>
              <span class="inline-flex items-center">
                ✓ Learning content associated with each scenario
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
  `
})
export class BestCDOChoiceComponent extends BaseCDOComponent  {
  isEditable = input<boolean>(false);
  audioReady = signal(false);
  muted = this.sounds.muted$;

  roles = [
    { name: "Data Steward", image: "assets/data_steward.png", description: "Responsible for data governance and compliance.", enabled: true },
    { name: "Data Sponsor", image: "assets/data_sponsor.png", description: "Provides funding and support for data initiatives.", enabled: false },
    { name: "Data Owner", image: "assets/data_owner.png", description: "Accountable for data quality and integrity.", enabled: false }
  ]


  onRoleSelect(role: any) {
    // Only proceed if the role is enabled
    if (role.enabled) {
      this.onStart();
    }
  }


  onStart() {
    this.router.navigate(['../start'], { relativeTo: this.activatedRoute });
  }




  

    
}