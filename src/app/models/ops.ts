

export interface PatchOp {
    op: "add" | "replace" | "remove";
    path: string;
    value: any | null;
    version: number;
}
export interface PatchResponse {
  version: number;       // new server version after patch
}