import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TodosComponent } from './pages/todos/todos.component';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { AmplifyZonelessBridgeDirective } from './directives/amplify-zoneless-bridge.directive';


@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, TodosComponent, AmplifyAuthenticatorModule, AmplifyZonelessBridgeDirective],
})
export class AppComponent {
  title = 'amplify-angular-template';
  authenticator = inject(AuthenticatorService);
    
  constructor() {}

}
