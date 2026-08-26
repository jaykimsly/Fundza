import { NextRequest, NextResponse } from 'next/server';
import { generateJson, generateMultimodalJson, isGeminiConfigured, reportSchema } from '@/lib/ai';
import { resolveSubject } from '@/lib/knowledge';
import { getSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'AI not configured', code: 'NO_API_KEY' }, { status: 503 });
    }

    const body = await request.json();
    const { fileData, mimeType, content, term, mode, studentId, fileName } = body;
    if (!studentId) return NextResponse.json({ error: 'Student ID required' }, { status: 400 });

    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: student } = await supabase.from('students').select('id,auth_user_id,grade').eq('id', studentId).maybeSingle();
    if (!student || student.auth_user_id !== user.id) return NextResponse.json({ error: 'Student access denied' }, { status: 403 });

    const prompt = `You are Fundza's South African school-report extraction engine. Extract only facts explicitly present in the supplied report. Do not invent, infer or autocomplete subject names, percentages, comments, school names, learner names, grades or terms. If a field is not present, return null. Preserve the report's subject wording exactly in the name field. ${term ? `The uploader says this is ${term}, but prefer the document if it states a different term.` : ''}

Extract the learner name, school, grade, term, overall performance and every subject with its percentage/comment. Weak and strong topics must only be included if explicitly supported by the report; otherwise return empty arrays.`;

    let analysis: any;
    if (mode === 'vision' && fileData) {
      analysis = await generateMultimodalJson(prompt, fileData, mimeType || 'application/pdf', reportSchema);
    } else {
      const safeContent = String(content || '').slice(0, 100000);
      if (!safeContent) return NextResponse.json({ error: 'Document content required' }, { status: 400 });
      analysis = await generateJson(`${prompt}\n\nREPORT CONTENT:\n${safeContent}`, reportSchema);
    }

    const resolvedSubjects = [];
    for (const subject of analysis.subjects || []) {
      const match = await resolveSubject(subject.name);
      resolvedSubjects.push({
        ...subject,
        subject_id: match?.id ?? null,
        subject_code: match?.code ?? null,
        normalized_subject_name: match?.name ?? null,
        subject_match_confidence: match?.confidence ?? 0,
      });
    }
    analysis.subjects = resolvedSubjects;

    const { data: document } = await supabase.from('documents').insert({
      student_id: studentId,
      file_name: fileName || 'uploaded-report',
      file_url: 'ai-analysis-input',
      file_type: 'report',
      document_date: new Date().toISOString().slice(0, 10),
    }).select('id').maybeSingle();

    if (document?.id) {
      await supabase.from('document_analyses').insert({
        document_id: document.id,
        student_id: studentId,
        overall_summary: analysis.overall_summary,
        subject_analyses: analysis.subjects,
        recommendations: analysis.overall_recommendations,
      });
    }

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed', code: 'MODEL_ERROR' }, { status: 500 });
  }
}
