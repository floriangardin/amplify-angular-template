import '../../amplify-config';
import { Injectable, signal } from '@angular/core';
import { uploadData, getUrl} from "aws-amplify/storage";






@Injectable({ providedIn: 'root' })
export class StorageService {


    async uploadPreview(data: any, path: string): Promise<void> {
        await uploadData({
            data: data,
            path: path
        });
    }


    async getLibraryItemUrl(path: string): Promise<URL> {
        const properties = await getUrl({ path: 'content/' + path });
        return properties.url;
    }

    

}
