import '../../amplify-config';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClientService {
    public client = generateClient<Schema>();
    
    constructor() {}

}