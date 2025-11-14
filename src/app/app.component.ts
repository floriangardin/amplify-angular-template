import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { AmplifyZonelessBridgeDirective } from './directives/amplify-zoneless-bridge.directive';
import { signInWithRedirect } from 'aws-amplify/auth';
import {ButtonComponent} from "./ui/elements/button.component";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, AmplifyAuthenticatorModule, AmplifyZonelessBridgeDirective, ButtonComponent],
})
export class AppComponent {
  title = 'amplify-angular-template';
  authenticator = inject(AuthenticatorService);
    
  constructor() {}

  async signInWithCompany() {
    // Trigger Hosted UI sign-in with the custom OIDC provider configured as 'MicrosoftEntraID'
    await signInWithRedirect({
      provider: { custom: 'MicrosoftEntraID' },
    });
  }

}
