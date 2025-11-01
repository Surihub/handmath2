import React, { useState, useRef, useEffect } from 'react';
import type { ProblemHistoryEntry } from '../types';
import { recognizeHandwriting, getFeedback } from '../services/geminiService';
import Canvas, { type CanvasRef } from './Canvas';
import { SparklesIcon } from './icons/SparklesIcon';
import { EraserIcon } from './icons/EraserIcon';
import { PenIcon } from './icons/PenIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

declare global {
  interface Window {
    katex: any;
    marked: any;
  }
}

interface MainPanelProps {
  addHistoryEntry: (entry: Omit<ProblemHistoryEntry, 'id' | 'timestamp'>) => void;
  theme: 'light' | 'dark';
}

type Status = 'IDLE' | 'RECOGNIZING' | 'LOADING' | 'SUCCESS';

const STATIC_PROBLEM_TEXT = "두 상수 a, b에 대하여";
const STATIC_PROBLEM_LATEX = String.raw`\lim_{x \to -2} \frac{\sqrt{2x + a} + b}{x + 2} = \frac{1}{3}`;
const STATIC_PROBLEM_TEXT_END = "일 때, a, b의 값을 구하시오.";

const MainPanel: React.FC<MainPanelProps> = ({ addHistoryEntry, theme }) => {
  const canvasRef = useRef<CanvasRef>(null);
  const feedbackDisplayRef = useRef<HTMLDivElement>(null);
  const problemLatexRef = useRef<HTMLDivElement>(null);
  const solutionLatexRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<Status>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [userMemo, setUserMemo] = useState<string>('');
  const [isCanvasEmpty, setIsCanvasEmpty] = useState<boolean>(true);
  const [canvasMode, setCanvasMode] = useState<'pen' | 'eraser'>('pen');

  const [userSolutionLatex, setUserSolutionLatex] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string>('');
  
  useEffect(() => {
    if (problemLatexRef.current && window.katex) {
        try {
            window.katex.render(STATIC_PROBLEM_LATEX, problemLatexRef.current, {
                throwOnError: false,
                displayMode: true,
            });
        } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (solutionLatexRef.current && window.katex) {
        solutionLatexRef.current.innerHTML = '';
        if (userSolutionLatex) {
            try {
                window.katex.render(userSolutionLatex, solutionLatexRef.current, {
                    throwOnError: false,
                    displayMode: true,
                });
            } catch (e) { console.error(e); }
        }
    }
  }, [userSolutionLatex]);

  useEffect(() => {
    if (status === 'SUCCESS' && aiFeedback && feedbackDisplayRef.current && window.marked) {
        const rawHtml = window.marked.parse(aiFeedback);
        feedbackDisplayRef.current.innerHTML = rawHtml;
    }
  }, [status, aiFeedback]);
  
  const handleConvertToText = async () => {
    if (!canvasRef.current || isCanvasEmpty) {
        setError("먼저 캔버스에 풀이를 작성해주세요.");
        return;
    }
    const imageDataUrl = canvasRef.current.getImageData();
    if (!imageDataUrl) {
        setError("캔버스가 비어있습니다.");
        return;
    }
    
    setStatus('RECOGNIZING');
    setError(null);
    try {
      const latex = await recognizeHandwriting(imageDataUrl);
      if (!latex) {
          throw new Error("수식을 인식할 수 없습니다. 더 명확하게 작성해주세요.");
      }
      setUserSolutionLatex(latex);
      setStatus('IDLE');
    } catch (e: any) {
      setError(e.message || '텍스트 변환 중 오류가 발생했습니다.');
      setStatus('IDLE');
    }
  };
  
  const handleGetFeedback = async () => {
    if (!userSolutionLatex) {
        setError("손글씨 풀이를 먼저 '텍스트로 변환하기' 버튼을 눌러 변환해주세요.");
        return;
    }
    
    setStatus('LOADING');
    setError(null);
    try {
      const feedback = await getFeedback(STATIC_PROBLEM_LATEX, userSolutionLatex, userMemo || "입력된 메모 없음");
      setAiFeedback(feedback);

      addHistoryEntry({
        problemLatex: STATIC_PROBLEM_LATEX,
        userSolutionLatex: userSolutionLatex,
        userMemo: userMemo,
        aiFeedback: feedback,
      });

      setStatus('SUCCESS');
    } catch (e: any) {
      setError(e.message || '알 수 없는 오류가 발생했습니다.');
      setStatus('IDLE');
    }
  };
  
  const handleClearAll = () => {
    canvasRef.current?.clear();
    setUserMemo('');
    setUserSolutionLatex('');
    setAiFeedback('');
    setError(null);
    setStatus('IDLE');
    setCanvasMode('pen');
  };
  
  return (
    <div className="flex-grow p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Problem Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">오늘의 문제</h2>
            <div className="text-gray-800 dark:text-gray-200 text-base md:text-lg text-center space-y-2">
                <p>{STATIC_PROBLEM_TEXT}</p>
                <div ref={problemLatexRef} />
                <p>{STATIC_PROBLEM_TEXT_END}</p>
            </div>
        </div>

        {/* Solution Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">풀이 작성하기</h2>
            <div className="grid md:grid-cols-2 gap-6">
                {/* Handwriting Part */}
                <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">1) 손글씨로 풀이 쓰기</h3>
                    <div className="flex items-center space-x-2 mb-2">
                        <button onClick={() => setCanvasMode('pen')} className={`p-2 rounded-md transition-colors ${canvasMode === 'pen' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} aria-label="펜 모드"><PenIcon className="w-5 h-5"/></button>
                        <button onClick={() => setCanvasMode('eraser')} className={`p-2 rounded-md transition-colors ${canvasMode === 'eraser' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`} aria-label="지우개 모드"><EraserIcon className="w-5 h-5"/></button>
                        <button onClick={() => canvasRef.current?.clear()} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="캔버스 초기화"><ArrowPathIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <Canvas ref={canvasRef} onDrawingChange={setIsCanvasEmpty} theme={theme} mode={canvasMode} />
                    </div>
                    <button onClick={handleConvertToText} disabled={isCanvasEmpty || status === 'RECOGNIZING'} className="mt-3 w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {status === 'RECOGNIZING' ? '변환 중...' : '텍스트로 변환하기'}
                    </button>
                    {userSolutionLatex && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg min-h-[50px]">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">변환 결과 (LaTeX)</p>
                            <div ref={solutionLatexRef} className="text-sm"></div>
                        </div>
                    )}
                </div>
                {/* Memo Part */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">2) 텍스트로 메모 남기기</h3>
                        <button onClick={() => setUserMemo('')} className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">초기화</button>
                    </div>
                    <textarea
                        value={userMemo}
                        onChange={(e) => setUserMemo(e.target.value)}
                        placeholder="예) 극한값을 구하기 위해 분모를 0으로 만드는 x값을 대입했는데, 그 다음이 헷갈려요."
                        className="flex-grow w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        rows={8}
                    />
                </div>
            </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col justify-center items-center gap-4">
          <button onClick={handleGetFeedback} disabled={!userSolutionLatex || status === 'LOADING'} className="w-full max-w-sm bg-indigo-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center text-lg">
             {status === 'LOADING' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  분석 중...
                </>
             ) : (
                <>
                  <SparklesIcon className="w-6 h-6 mr-2" />
                  AI 피드백 받기
                </>
             )}
          </button>
           <button onClick={handleClearAll} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
            전체 초기화
          </button>
        </div>
        
        {error && <p className="text-red-500 text-sm text-center font-medium bg-red-100 dark:bg-red-900/30 py-2 px-4 rounded-md">{error}</p>}

        {/* Output Section */}
        {status === 'SUCCESS' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
              <h2 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">AI 피드백</h2>
              <div ref={feedbackDisplayRef} className="prose prose-indigo dark:prose-invert max-w-none text-base"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPanel;
