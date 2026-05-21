'use client';

import { useUpload } from '../hooks/useUpload';
import { useHistory } from '../hooks/useHistory';
import { useFileViewer } from '../hooks/useFileViewer';
import UploadDialog from './UploadDialog';
import HistoryList from './HistoryList';
import FileViewerModal from './FileViewerModal';

export default function CirasClient() {
  const history = useHistory();
  const upload = useUpload(history.refresh);
  const viewer = useFileViewer();

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              CIRAS UPLOADS
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and review your uploaded crime data files
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <UploadDialog
              open={upload.dialogOpen}
              onOpenChange={upload.setDialogOpen}
              selectedFile={upload.selectedFile}
              isUploading={upload.isUploading}
              uploadOutcome={upload.uploadOutcome}
              feedbackMessage={upload.feedbackMessage}
              onFileChange={upload.handleFileChange}
              onUpload={upload.handleUpload}
              onDelete={upload.handleDelete}
            />
          </div>
        </div>
      </div>

      <HistoryList
        uploadHistory={history.uploadHistory}
        isLoading={history.isLoading}
        error={history.error}
        currentPage={history.currentPage}
        totalPages={history.totalPages}
        paginatedHistory={history.paginatedHistory}
        startIndex={history.startIndex}
        endIndex={history.endIndex}
        onPageChange={history.setCurrentPage}
        onRefresh={history.refresh}
        onViewFile={viewer.openFile}
      />

      <FileViewerModal
        open={viewer.modalOpen}
        onOpenChange={(open) => !open && viewer.closeModal()}
        selectedEntry={viewer.selectedEntry}
        fileContents={viewer.fileContents}
        isLoading={viewer.isLoading}
        currentPage={viewer.currentPage}
        totalPages={viewer.totalPages}
        paginatedContents={viewer.paginatedContents}
        startIndex={viewer.startIndex}
        endIndex={viewer.endIndex}
        onPageChange={viewer.setCurrentPage}
      />
    </div>
  );
}
