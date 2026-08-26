import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 300;

const clean = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();
const numberOrNull = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : null; };
const intOrNull = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : null; };
const boolFromStatus = (value: unknown) => ['OPEN','ACTIVE','YES','TRUE','1'].includes(String(value ?? '').trim().toUpperCase());

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.SCHOOL_IMPORT_SECRET;
    if (!secret || request.headers.get('x-school-import-secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'An .xlsx file is required' }, { status: 400 });
    }

    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const required = ['Official_Institution_Name', 'NatEmis', 'EIDistrict', 'Province'];
    const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(rows[0] || {}, key));
    if (missing.length) return NextResponse.json({ error: `Missing required columns: ${missing.join(', ')}` }, { status: 422 });

    const schools = rows.map((r) => ({
      name: clean(r['Official_Institution_Name']), province: clean(r['Province']), town: clean(r['Town_City']), type: clean(r['Type_DoE']),
      curriculum: clean(r['Specialisation']), emis_number: clean(r['NatEmis']), district: clean(r['EIDistrict']), municipality: clean(r['DMunName']),
      circuit: clean(r['EICircuit']), area: clean(r['Township_Village']), phase: clean(r['Phase_PED']), sector: clean(r['Sector']),
      address: clean(r['StreetAddress']), phone: clean(r['Telephone']), email: clean(r['Email']), latitude: numberOrNull(r['GIS_Lat']), longitude: numberOrNull(r['GIS_Long']),
      active: boolFromStatus(r['Status']), data_source: 'DBE EMIS XLSX import', data_source_date: new Date().toISOString().slice(0, 10), data_year: intOrNull(r['DataYear']) ?? 2025,
      status: clean(r['Status']), school_type: clean(r['Type_DoE']), specialisation: clean(r['Specialisation']), owner_land: clean(r['OwnerLand']), owner_build: clean(r['OwnerBuild']),
      ex_department: clean(r['ExDept']), persal_paypoint_number: clean(r['Persal_PaypointNo']), persal_component_number: clean(r['Persal_ComponentNo']), exam_number: clean(r['ExamNo']),
      exam_centre: clean(r['ExamCentre']), ward_id: clean(r['Ward_ID']), sp_code: clean(r['SP_Code']), sp_name: clean(r['SP_Name']), addressee: clean(r['Addressee']),
      locality: clean(r['Township_Village']), suburb: clean(r['Suburb']), street_address: clean(r['StreetAddress']), postal_address: clean(r['PostalAddress']), section21: clean(r['Section21']),
      section21_function: clean(r['Section21_Function']), quintile: clean(r['Quintile']), nas: clean(r['NAS']), nodal_area: clean(r['NodalArea']), registration_date: clean(r['Registration_Date']),
      no_fee_school: clean(r['NoFeeSchool']), urban_rural: clean(r['Urban_Rural']), allocation: clean(r['Allocation']), demarcation_from: clean(r['Demarcation_From']), demarcation_to: clean(r['Demarcation_To']),
      old_natemis: clean(r['OldNATEMIS']), new_natemis: clean(r['NewNATEMIS']), learners_2025: intOrNull(r['Learners2025']), educators_2025: intOrNull(r['Educators2025'])
    })).filter((school) => school.name && school.emis_number);

    if (schools.length < 1000) return NextResponse.json({ error: `Refusing import: only ${schools.length} valid EMIS schools found` }, { status: 422 });

    const supabase = getSupabaseAdmin();
    const province = String(schools[0].province || '').toUpperCase();
    if (province === 'MP' || province === 'MPUMALANGA') {
      const { error: deleteError } = await supabase.from('schools').delete().in('province', ['MP', 'Mpumalanga', 'MPUMALANGA']);
      if (deleteError) throw deleteError;
    }

    for (let i = 0; i < schools.length; i += 200) {
      const { error } = await supabase.from('schools').upsert(schools.slice(i, i + 200), { onConflict: 'emis_number' });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, rows_read: rows.length, schools_imported: schools.length, province });
  } catch (error: any) {
    console.error('School import failed:', error);
    return NextResponse.json({ error: error.message || 'School import failed' }, { status: 500 });
  }
}
