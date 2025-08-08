import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/src/services';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// POST /api/v2/leads/import - Import leads from CSV/Excel
export async function POST(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingStr = formData.get('mapping') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!mappingStr) {
      return NextResponse.json(
        { error: 'No field mapping provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV or Excel file.' },
        { status: 400 }
      );
    }

    // Parse mapping
    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(mappingStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid mapping format' },
        { status: 400 }
      );
    }

    const result = await leadService.importLeads(organization.id, file, mapping);

    return NextResponse.json({
      message: 'Import completed',
      result: {
        success: result.success,
        failed: result.failed,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}