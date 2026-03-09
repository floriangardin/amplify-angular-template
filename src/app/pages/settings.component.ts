import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../components/header.component';
import { signOut } from 'aws-amplify/auth';
import { ClientService } from '../services/client.service';
import { ConfirmDialogComponent } from '../ui/elements/confirm-dialog.component';
import { deleteUser } from 'aws-amplify/auth';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
  <app-header></app-header>
  <div class="card-dark p-0 space-y-8 flex flex-col items-center mt-8 md:m-16 p-8">

    <h1 class="text-3xl font-bold mb-8">Account Settings</h1>

    <h1 class="text-3xl font-bold mb-8">Danger Zone</h1>

    <button
      type="button"
      class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      (click)="promptDeleteAccount()"
    >
      Delete Account
    </button>
  </div>
  @if(showConfirm()){
    <app-confirm-dialog
      [title]="'Delete Account'"
      [message]="confirmMessage()"
      [confirmLabel]="deleting() ? 'Deleting\u2026' : 'Delete'"
      [cancelLabel]="'Cancel'"
      (confirmed)="confirmDeleteAccount()"
      (cancelled)="cancelDeleteAccount()"
    />
  }
  `,
  host: { class: 'w-full block' },
  styles: [`
    :host { display: block; width: 100vw; height: 100vh; }
  `],
  imports: [
    CommonModule,
    HeaderComponent,
    ConfirmDialogComponent,
  ],
})
export class SettingsComponent {

  clientService = inject(ClientService);
  userService = inject(UserService);

  constructor(){
    this.userService.init();
  }

  showConfirm = signal(false);
  deleting = signal(false);
  confirmMessage = signal('');

  onSignOut() {
    signOut();
  }

  promptDeleteAccount(){
      this.confirmMessage.set(`Are you sure you want to delete your account? This action cannot be undone.`);
      this.showConfirm.set(true);
  }

  cancelDeleteAccount(){
    if(this.deleting()) return;
    this.showConfirm.set(false);
  }

  async confirmDeleteAccount(){
    await this.onDeleteUser();
  }

  async onDeleteUser() {
      try {
        await deleteUser();
      } catch (error) {
        console.log(error);
      }
  }
}
