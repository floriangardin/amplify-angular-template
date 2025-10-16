import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

// Configure Amplify as a side effect so any module importing this file
// will have Amplify configured before its module body runs.
Amplify.configure(outputs);
