import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Configure Amplify before Angular bootstraps so any eager imports (e.g., generateClient) see config
Amplify.configure(outputs);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
