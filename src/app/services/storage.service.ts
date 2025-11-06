import '../../amplify-config';
import { Injectable, signal } from '@angular/core';
import { uploadData } from "aws-amplify/storage";






@Injectable({ providedIn: 'root' })
export class StorageService {


    async uploadPreview(data: any, path: string): Promise<void> {
        await uploadData({
            data: data,
            path: path
        });
    }

    

}
