import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey.length > 10 && !apiKey.includes('your-gemini') 
  ? new GoogleGenerativeAI(apiKey) 
  : null;

async function tryGenerate(modelName: string, prompt: string, fileData?: any, mimeType?: string) {
  if (!genAI) throw new Error('LLM not initialized');
  const model = genAI.getGenerativeModel({ model: modelName });
  if (fileData) {
    return model.generateContent([prompt, { inlineData: { data: fileData, mimeType: mimeType || 'image/jpeg' } } as any]);
  }
  return model.generateContent(prompt);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileData, mimeType, content, term, mode, jobId, studentId } = body;

    // POLLING: Check job status
    if (jobId) {
      const { data: job } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      if (job.status === 'done') return NextResponse.json({ success: true, analysis: job.result });
      if (job.status === 'error') return NextResponse.json({ error: job.error_message }, { status: 500 });
      return NextResponse.json({ status: job.status });
    }

    // CHECK API KEY
    if (!genAI) {
      return NextResponse.json({
        error: 'AI not configured',
        code: 'NO_API_KEY',
        message: 'GEMINI_API_KEY is missing in .env.local. Get one free at aistudio.google.com/app/apikey',
      }, { status: 503 });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // CREATE JOB
    const newJobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await supabase.from('analysis_jobs').insert({
      id: newJobId,
      student_id: studentId,
      status: 'pending',
      file_name: fileData ? 'image-upload' : 'text-paste',
      term: term || 'Unknown',
    });

    // PROCESS IN BACKGROUND (fire and forget)
    (async () => {
      await supabase.from('analysis_jobs').update({ status: 'processing' }).eq('id', newJobId);

      const prompt = `You are an expert South African school report analyzer. ${term ? `This is a ${term} report.` : ''}

Extract from this student report:
1. Student name
2. School name  
3. Grade (10, 11, or 12)
4. Term
5. EACH subject: name, percentage, comment
6. Overall average
7. Pass/fail count
8. Teacher comments

Return ONLY valid JSON:
{
  "student_name": "...", "school_name": "...", "grade": 12, "term": "Term 3",
  "overall_summary": "...", "overall_average": 65,
  "subjects_passed": 6, "subjects_failed": 1,
  "subjects": [{"name": "Maths Lit", "percentage": 40, "level": 3, "comment": "...", "weak_topics": [], "strong_topics": []}],
  "overall_recommendations": ["..."],
  "aps_estimate": 24, "pass_type": "Diploma"
}

Use null for unknown values.`;

      try {
        const fullPrompt = mode === 'text' 
          ? `${prompt}\n\nReport:\n"""${content?.slice(0, 20000)}"""` 
          : prompt;

        const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro'];
        let result, lastError;

        for (const modelName of models) {
          try {
            result = await tryGenerate(modelName, fullPrompt, mode === 'vision' ? fileData : undefined, mimeType);
            break;
          } catch (e: any) {
            lastError = e;
            if (e.message?.includes('404')) continue;
            throw e;
          }
        }

        if (!result) throw lastError || new Error('All models failed');

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid JSON from AI');

        const analysis = JSON.parse(jsonMatch[0]);

        await supabase.from('analysis_jobs').update({
          status: 'done',
          result: analysis,
        }).eq('id', newJobId);

      } catch (err: any) {
        await supabase.from('analysis_jobs').update({
          status: 'error',
          error_message: err.message || 'Processing failed',
        }).eq('id', newJobId);
      }
    })();

    return NextResponse.json({ success: true, jobId: newJobId, status: 'pending' });

  } catch (err: any) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: err.message, code: 'UNKNOWN' }, { status: 500 });
  }
}
