export type UploadOutcome = 'idle' | 'success' | 'warn' | 'info' | 'error';

export type UploadHistoryEntry = {
  id: number;
  filename: string;
  fileHash: string;
  uploadedAt: string;
  uploader: {
    id: number;
    user_email: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FileContentRow = Record<string, any>;

export const ITEMS_PER_PAGE = 10;
