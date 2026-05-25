

'use client';

import { Button } from '@/components/ui/button';
import { FileUp, X } from 'lucide-react';


interface StatusBannersProps {
  showNoLayerBanner: boolean;
  layerError: string | null;
  onDismissError: () => void;
}


export default function StatusBanners({
  showNoLayerBanner,
  layerError,
  onDismissError,
}: StatusBannersProps) {
  return (
    <>
      {showNoLayerBanner && (
        <div className="bg-brand/10 border border-brand/20 rounded-lg px-4 py-3 mb-4 shrink-0 flex items-center gap-3">
          <FileUp className="w-5 h-5 text-brand shrink-0" />
          <span className="text-sm text-brand font-medium">
            No layer data loaded. Upload Boundaries or Zoning files to display
            on the map.
          </span>
        </div>
      )}

      {layerError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium">
              {layerError}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismissError}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 px-3"
          >
            Dismiss
          </Button>
        </div>
      )}
    </>
  );
}
