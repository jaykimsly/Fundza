'use client';

import { useState, useEffect } from 'react';
import { questions as fallbackQuestions } from '@/data/questions';
import { Question } from '@/types';
import Link from 'next/link';
import QuestionComponent from './Question';
import StatusScreen from './StatusScreen';
import { supabase } from '@/lib/supabase';

interface Props { topicId: string | null; }
type LiveQuestion = { id:string; question_text:string; difficulty:string|null; topic_id:string|null; question_options?:{label:string;option_text:string}[]; question_answers?:{correct_answer:string;explanation:string|null;steps:any}|null };

function toQuestion(q: LiveQuestion): Question {
  const answer=q.question_answers; const options=(q.question_options||[]).sort((a,b)=>a.label.localeCompare(b.label));
  return { id:q.id, topicId:q.topic_id||'', questionText:q.question_text, options:options.map(o=>({label:o.label,text:o.option_text})), correctAnswer:answer?.correct_answer||'', explanation:answer?.explanation||'Review the worked answer and try again.', steps:Array.isArray(answer?.steps)?answer.steps.map(String):[], difficulty:(q.difficulty==='easy'||q.difficulty==='hard')?q.difficulty:'medium' };
}

export default function Quiz({ topicId }: Props) {
  const [questions,setQuestions]=useState<Question[]>([]); const [currentIndex,setCurrentIndex]=useState(0); const [selectedAnswer,setSelectedAnswer]=useState<string|null>(null); const [submitted,setSubmitted]=useState(false); const [score,setScore]=useState(0); const [showResults,setShowResults]=useState(false); const [retryMode,setRetryMode]=useState(false); const [wrongQuestions,setWrongQuestions]=useState<Question[]>([]); const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState<string|null>(null);

  const loadQuestions=async()=>{ setLoading(true);setLoadError(null); try { const query=supabase.from('questions').select('id, question_text, difficulty, topic_id, question_options(label, option_text), question_answers(correct_answer, explanation, steps)').limit(20); const {data,error}=topicId?await query.eq('topic_id',topicId):await query; if(error)throw error; const live=((data||[]) as LiveQuestion[]).map(toQuestion).filter(q=>q.correctAnswer); const selected=live.length?live:(topicId?fallbackQuestions.filter(q=>q.topicId===topicId):fallbackQuestions.slice(0,5)); setQuestions(selected.length?selected:fallbackQuestions.slice(0,3)); reset(); } catch(err:any){ console.error('Quiz load error:',err); const fallback=topicId?fallbackQuestions.filter(q=>q.topicId===topicId):fallbackQuestions.slice(0,5); if(fallback.length){setQuestions(fallback);setLoadError('The live question bank is unavailable, so Fundza is using the available practice questions.');reset(false);} else setLoadError(err?.message||'We could not load questions.'); } finally{setLoading(false);} };
  const reset=(clearQuestions=true)=>{setCurrentIndex(0);setSelectedAnswer(null);setSubmitted(false);setScore(0);setShowResults(false);setRetryMode(false);setWrongQuestions([]);};
  useEffect(()=>{loadQuestions();},[topicId]);
  const currentQuestion=questions[currentIndex];
  const handleSubmit=()=>{if(!selectedAnswer||!currentQuestion)return;setSubmitted(true);if(selectedAnswer===currentQuestion.correctAnswer)setScore(s=>s+1);else setWrongQuestions(w=>[...w,currentQuestion]);};
  const handleNext=()=>{if(currentIndex<questions.length-1){setCurrentIndex(i=>i+1);setSelectedAnswer(null);setSubmitted(false);}else setShowResults(true);};
  const handleRetry=()=>{if(!wrongQuestions.length)return;setQuestions(wrongQuestions);setWrongQuestions([]);setCurrentIndex(0);setSelectedAnswer(null);setSubmitted(false);setScore(0);setShowResults(false);setRetryMode(true);};
  const saveAttempt=async()=>{const studentId=localStorage.getItem('fundza_student_id');if(!studentId)return;try{await supabase.from('quiz_attempts').insert({student_id:studentId,topic_id:topicId,score,total_questions:questions.length});}catch(err){console.error('Could not save quiz attempt:',err);}};
  useEffect(()=>{if(showResults&&!retryMode)saveAttempt();},[showResults,retryMode]);

  if(loading)return <div className="card" aria-busy="true"><h2>Loading your quiz</h2><div className="skeleton skeleton-block"/></div>;
  if(loadError&&questions.length===0)return <StatusScreen kind="error" message={loadError} onRetry={loadQuestions}/>;
  if(!currentQuestion)return <div className="card empty-state"><h2>No questions available</h2><p>There are no questions for this topic yet.</p><Link href="/study" className="btn">Back to Study</Link></div>;
  if(showResults){const percentage=Math.round((score/questions.length)*100);return <div className="card"><h2>{retryMode?'Retry Results':'Quiz Complete'}</h2>{loadError&&<div className="warning-box">{loadError}</div>}<div style={{textAlign:'center',padding:'2rem 0'}}><div style={{fontSize:'3rem',fontWeight:700}}>{percentage}%</div><p style={{color:'#64748b',marginTop:'.5rem'}}>{score} correct out of {questions.length}</p></div>{!retryMode&&wrongQuestions.length>0&&<div style={{marginBottom:'1.5rem'}}><p style={{color:'#991b1b',marginBottom:'.75rem'}}>You got {wrongQuestions.length} question{wrongQuestions.length>1?'s':''} wrong.</p><button onClick={handleRetry} className="btn btn-secondary">Retry Wrong Questions</button></div>}<div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}><button onClick={loadQuestions} className="btn">Restart Quiz</button><Link href="/study" className="btn btn-secondary">Back to Study</Link><Link href="/progress" className="btn btn-success">View Progress</Link></div></div>;}
  return <div><div style={{marginBottom:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}><h2>Quiz</h2><span style={{color:'#64748b',fontSize:'.875rem'}}>Question {currentIndex+1} / {questions.length}</span></div><div className="card"><QuestionComponent question={currentQuestion} selectedAnswer={selectedAnswer} submitted={submitted} onSelect={setSelectedAnswer}/>{!submitted?<button onClick={handleSubmit} className="btn" disabled={!selectedAnswer}>Submit</button>:<div><div style={{padding:'1rem',borderRadius:'8px',marginBottom:'1rem',background:selectedAnswer===currentQuestion.correctAnswer?'#ecfdf5':'#fef2f2',color:selectedAnswer===currentQuestion.correctAnswer?'#166534':'#991b1b',fontWeight:600}}>{selectedAnswer===currentQuestion.correctAnswer?'✓ CORRECT':'✗ NOT QUITE'}{selectedAnswer!==currentQuestion.correctAnswer&&<span style={{display:'block',marginTop:'.5rem',fontWeight:400}}>Correct answer: {currentQuestion.correctAnswer}</span>}</div><div className="explanation"><strong>Explanation:</strong><p style={{marginTop:'.5rem'}}>{currentQuestion.explanation}</p>{currentQuestion.steps.length>0&&<ol className="steps">{currentQuestion.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>}</div><button onClick={handleNext} className="btn">{currentIndex<questions.length-1?'Next Question':'See Results'}</button></div>}</div><div style={{marginTop:'1rem',textAlign:'center',color:'#64748b',fontSize:'.875rem'}}>Score so far: {score} / {currentIndex+(submitted?1:0)}</div></div>;
}
