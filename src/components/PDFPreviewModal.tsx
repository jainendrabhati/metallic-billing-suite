import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  onDownload: () => void;
  onPrint: () => void;
}

const PDFPreviewModal = ({ 
  isOpen, 
  onOpenChange, 
  title, 
  content, 
  onDownload, 
  onPrint 
}: PDFPreviewModalProps) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    onPrint();
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    onDownload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {title}
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <iframe
            srcDoc={content}
            className="w-full h-[70vh] border rounded"
            title="PDF Preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;