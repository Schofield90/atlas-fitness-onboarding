import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
} from '@react-pdf/renderer';
// Remove unused import

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  text: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  signature: {
    marginTop: 40,
    borderTop: '1px solid #e5e7eb',
    paddingTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureColumn: {
    width: '45%',
  },
  signatureText: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  signatureImage: {
    width: 100,
    height: 50,
    marginBottom: 5,
  },
});

interface DocumentProps {
  content: string;
  title: string;
  signatureName: string;
  signatureDate: string;
  employerName?: string;
  employerSignatureUrl?: string;
  employerSignatureDate?: string;
  employeeSignatureUrl?: string;
}

// PDF Document Component
export const PDFDocument: React.FC<DocumentProps> = ({
  content,
  title,
  signatureName,
  signatureDate,
  employerName,
  employerSignatureUrl,
  employerSignatureDate,
  employeeSignatureUrl,
}) => {
  // Split content into sections for better PDF formatting
  const sections = content.split('\\n\\n').filter(section => section.trim());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Schofield Fitness Ltd trading as Atlas Fitness
          </Text>
        </View>

        {sections.map((section, index) => {
          // Check if this is a heading (all caps)
          const isHeading = section === section.toUpperCase() && section.length < 50;
          
          return (
            <View key={index} style={styles.section}>
              {isHeading ? (
                <Text style={styles.sectionTitle}>{section}</Text>
              ) : (
                <Text style={styles.text}>{section}</Text>
              )}
            </View>
          );
        })}

        <View style={styles.signature}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureText}>Employee Signature</Text>
              {employeeSignatureUrl ? (
                <Image style={styles.signatureImage} src={employeeSignatureUrl} alt="Employee signature" />
              ) : (
                <Text style={styles.signatureName}>{signatureName}</Text>
              )}
              <Text style={styles.signatureText}>
                Date: {new Date(signatureDate).toLocaleDateString('en-GB')}
              </Text>
            </View>
            
            <View style={styles.signatureColumn}>
              <Text style={styles.signatureText}>Employer Signature</Text>
              {employerSignatureUrl ? (
                <Image style={styles.signatureImage} src={employerSignatureUrl} alt="Employer signature" />
              ) : (
                <Text style={styles.signatureName}>{employerName || 'Sam Schofield'}</Text>
              )}
              <Text style={styles.signatureText}>
                Date: {employerSignatureDate ? new Date(employerSignatureDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Generate PDF as blob for saving
export const generatePDFBlob = async (props: DocumentProps): Promise<Blob> => {
  const doc = <PDFDocument {...props} />;
  const blob = await pdf(doc).toBlob();
  return blob;
};