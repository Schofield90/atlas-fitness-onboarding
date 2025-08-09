'use client';

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Progress } from '@/app/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: (results: ImportResults) => void;
  organizationId: string;
}

interface ImportResults {
  total: number;
  success: number;
  failed: number;
  duplicates: number;
}

interface FieldMapping {
  csvField: string;
  leadField: string;
}

const LEAD_FIELDS = [
  { value: 'name', label: 'Full Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'source', label: 'Lead Source' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' },
  { value: 'custom_fields', label: 'Custom Fields' },
];

export default function BulkImportModal({ open, onClose, onImportComplete, organizationId }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvData(results.data);
          setCsvHeaders(Object.keys(results.data[0] || {}));
          initializeFieldMappings(Object.keys(results.data[0] || {}));
          setStep('mapping');
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          setCsvData(jsonData);
          setCsvHeaders(Object.keys(jsonData[0] || {}));
          initializeFieldMappings(Object.keys(jsonData[0] || {}));
          setStep('mapping');
        } catch (err: any) {
          setError(`Error parsing Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      setError('Please upload a CSV or Excel file');
    }
  }, []);

  const initializeFieldMappings = (headers: string[]) => {
    const mappings: FieldMapping[] = headers.map(header => {
      const lowerHeader = header.toLowerCase();
      let leadField = '';
      
      // Auto-map common fields
      if (lowerHeader.includes('name')) leadField = 'name';
      else if (lowerHeader.includes('email')) leadField = 'email';
      else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) leadField = 'phone';
      else if (lowerHeader.includes('source')) leadField = 'source';
      else if (lowerHeader.includes('note')) leadField = 'notes';
      else if (lowerHeader.includes('tag')) leadField = 'tags';
      
      return { csvField: header, leadField };
    });
    
    setFieldMappings(mappings);
  };

  const updateFieldMapping = (csvField: string, leadField: string) => {
    setFieldMappings(prev => 
      prev.map(mapping => 
        mapping.csvField === csvField 
          ? { ...mapping, leadField }
          : mapping
      )
    );
  };

  const downloadTemplate = () => {
    const template = [
      ['Name', 'Email', 'Phone', 'Source', 'Notes', 'Tags'],
      ['John Doe', 'john@example.com', '+447777777777', 'Website', 'Interested in membership', 'new,hot-lead'],
      ['Jane Smith', 'jane@example.com', '+447888888888', 'Facebook', 'Wants personal training', 'new,pt-interest'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'lead_import_template.xlsx');
  };

  const startImport = async () => {
    if (!csvData.length) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    setStep('importing');
    setImportProgress(0);
    setError(null);

    try {
      // Prepare data for import
      const mappedData = csvData.map(row => {
        const lead: any = {};
        fieldMappings.forEach(mapping => {
          if (mapping.leadField && row[mapping.csvField] !== undefined) {
            lead[mapping.leadField] = row[mapping.csvField];
          }
        });
        return lead;
      });

      // Send to API
      const response = await fetch('/api/v2/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: mappedData,
          organizationId,
          options: {
            duplicateHandling,
            updateExisting: duplicateHandling === 'update',
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      setImportResults({
        total: result.total || mappedData.length,
        success: result.success || 0,
        failed: result.failed || 0,
        duplicates: result.duplicates || 0,
      });
      
      setStep('complete');
      setImportProgress(100);
      
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setImporting(false);
      setStep('mapping');
    }
  };

  const resetModal = () => {
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMappings([]);
    setDuplicateHandling('skip');
    setImporting(false);
    setImportProgress(0);
    setImportResults(null);
    setError(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import multiple leads at once
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="flex flex-col items-center space-y-4">
                <Upload className="h-12 w-12 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports CSV and Excel files (max 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Map CSV Fields to Lead Fields</h3>
              <p className="text-xs text-gray-500">
                We've automatically mapped some fields. Please review and adjust as needed.
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
              {fieldMappings.map((mapping) => (
                <div key={mapping.csvField} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">{mapping.csvField}</Label>
                  </div>
                  <div className="flex-1">
                    <select
                      value={mapping.leadField}
                      onChange={(e) => updateFieldMapping(mapping.csvField, e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="">-- Skip Field --</option>
                      {LEAD_FIELDS.map(field => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Duplicate Handling</Label>
              <RadioGroup value={duplicateHandling} onValueChange={(value: any) => setDuplicateHandling(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="text-sm">Skip duplicates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update" className="text-sm">Update existing leads</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="text-sm">Create duplicates anyway</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-500">
                {csvData.length} records ready to import
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={startImport} disabled={importing}>
                  Start Import
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-gray-600">Importing leads...</p>
              <Progress value={importProgress} className="w-full max-w-xs" />
              <p className="text-xs text-gray-500">
                Processing {csvData.length} records
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-sm text-gray-600">
                Successfully imported {importResults.success} out of {importResults.total} leads
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                <div className="text-xs text-gray-600">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{importResults.duplicates}</div>
                <div className="text-xs text-gray-600">Duplicates</div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}