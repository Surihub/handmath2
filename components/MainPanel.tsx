import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { ProblemHistoryEntry } from '../types';
import { recognizeHandwriting, getFeedback } from '../services/openAIService';
import Canvas, { type CanvasRef } from './Canvas';
import { SparklesIcon } from './icons/SparklesIcon';
import { EraserIcon } from './icons/EraserIcon';

declare global {
  interface Window {
    katex: any;
    marked: any;
  }
}

interface MainPanelProps {
  addHistoryEntry: (entry: Omit<ProblemHistoryEntry, 'id' | 'timestamp'>) => void;
}

type Step = 'DRAWING' | 'SOLVING' | 'FEEDBACK';

const MainPanel: React.FC<MainPanelProps> = ({ addHistoryEntry }) => {
  const canvasRef = useRef<CanvasRef>(null);
  const problemDisplayRef = useRef<HTMLDivElement>(null);
  const feedbackDisplayRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<Step>('SOLVING');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recognizedLatex, setRecognizedLatex] = useState<string>('\\text{두 상수 } a, b \\text{에 대하여 } \\lim_{x \\to -2} \\frac{\\sqrt{2x+a}+b}{x+2} = \\frac{1}{3} \\text{ 일 때, } a \\text{와 } b\\text{의 값을 구하시오.}');
  const [userSolution, setUserSolution] = useState<string>('');
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isCanvasEmpty, setIsCanvasEmpty] = useState<boolean>(true);


  const loadingMessage = useMemo(() => {
    if (currentStep === 'DRAWING') return '손글씨를 인식하는 중입니다...';
    if (currentStep === 'SOLVING') return 'AI가 풀이를 분석하고 있습니다...';
    return '';
  }, [currentStep]);

  useEffect(() => {
    if (recognizedLatex && problemDisplayRef.current && window.katex) {
      try {
        const html = window.katex.renderToString(recognizedLatex, {
          throwOnError: false,
          displayMode: true,
        });
        problemDisplayRef.current.innerHTML = html;
      } catch (e) {
        console.error("KaTeX rendering error:", e);
        if (problemDisplayRef.current) {
          problemDisplayRef.current.textContent = `LaTeX 렌더링 오류: ${recognizedLatex}`;
        }
      }
    }
  }, [recognizedLatex]);

  useEffect(() => {
    if (aiFeedback && feedbackDisplayRef.current && window.marked) {
        const rawHtml = window.marked.parse(aiFeedback);
        feedbackDisplayRef.current.innerHTML = rawHtml;

        // After setting HTML, find all LaTeX blocks and render them
        const latexElements = feedbackDisplayRef.current.querySelectorAll('p, li');
        latexElements.forEach(el => {
            const textContent = el.textContent || '';
            const latexRegex = /\\$(.*?)\\$/g;
            if(latexRegex.test(textContent)) {
                const newHtml = textContent.replace(latexRegex, (match, latex) => {
                    try {
                        return window.katex.renderToString(latex, { throwOnError: false });
                    } catch (e) {
                        return match; // return original on error
                    }
                });
                el.innerHTML = newHtml;
            }
        });
    }
  }, [aiFeedback]);

  const handleRecognize = async () => {
    if (!canvasRef.current) return;
    const imageDataUrl = canvasRef.current.getImageData();
    if (!imageDataUrl) {
        setError("캔버스가 비어있습니다. 문제를 작성해주세요.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const latex = await recognizeHandwriting(imageDataUrl);
      if (!latex) {
          throw new Error("수식을 인식할 수 없습니다. 더 명확하게 작성해주세요.");
      }
      setRecognizedLatex(latex);
      setCurrentStep('SOLVING');
    } catch (e: any) {
      setError(e.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetFeedback = async () => {
    if (!userSolution.trim()) {
      setError("풀이를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const feedback = await getFeedback(recognizedLatex, userSolution);
      setAiFeedback(feedback);
      setCurrentStep('FEEDBACK');
      addHistoryEntry({
        problemLatex: recognizedLatex,
        userSolution: userSolution,
        aiFeedback: feedback,
      });
    } catch (e: any) {
      setError(e.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartNew = () => {
    setCurrentStep('DRAWING');
    setRecognizedLatex('');
    setUserSolution('');
    setAiFeedback('');
    setError(null);
    canvasRef.current?.clear();
  };

  const handleClearCanvas = () => {
    canvasRef.current?.clear();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">{loadingMessage}</p>
        </div>
      );
    }
    
    if (currentStep === 'FEEDBACK') {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">문제</h2>
                    <div ref={problemDisplayRef} className="text-2xl mt-2 text-gray-900 dark:text-gray-100"></div>
                </div>
                 <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">나의 풀이</h2>
                    <p className="whitespace-pre-wrap mt-2 text-gray-700 dark:text-gray-300">{userSolution}</p>
                </div>
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto">
                    <h2 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">AI 피드백</h2>
                    <div ref={feedbackDisplayRef} className="prose prose-indigo dark:prose-invert max-w-none"></div>
                </div>
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <button onClick={handleStartNew} className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                        다른 문제 풀기
                    </button>
                </div>
            </div>
        )
    }

    if (currentStep === 'SOLVING') {
        return (
             <div className="flex flex-col h-full">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">인식된 문제</h2>
                    <div ref={problemDisplayRef} className="text-2xl mt-2 text-gray-900 dark:text-gray-100"></div>
                </div>
                <div className="flex-grow p-4 sm:p-6 flex flex-col">
                    <label htmlFor="solution" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">풀이 과정을 단계별로 입력하세요:</label>
                    <textarea
                        id="solution"
                        value={userSolution}
                        onChange={(e) => setUserSolution(e.target.value)}
                        className="w-full flex-grow p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="예시)&#10;1. 분모가 0에 수렴하므로, 분자도 0에 수렴해야 한다.&#10;2. ..."
                    />
                </div>
                 {error && <p className="text-red-500 text-sm px-6 pb-2 text-center">{error}</p>}
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center space-x-4">
                     <button onClick={handleStartNew} className="w-1/3 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">
                        뒤로
                    </button>
                    <button onClick={handleGetFeedback} className="w-2/3 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        피드백 받기
                    </button>
                </div>
            </div>
        )
    }

    // Default to DRAWING step
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 sm:p-6 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">아래에 수학 문제를 손으로 써보세요</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">마우스나 손가락을 사용해 캔버스에 필기하세요.</p>
            </div>
            <div className="flex-grow p-4 sm:p-6 relative">
                 <Canvas ref={canvasRef} onDrawingChange={(empty) => setIsCanvasEmpty(empty)} />
            </div>
            {error && <p className="text-red-500 text-sm px-6 pb-2 text-center">{error}</p>}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center space-x-4">
                 <button onClick={handleClearCanvas} className="w-1/3 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors flex items-center justify-center">
                    <EraserIcon className="w-5 h-5 mr-2" />
                    지우기
                </button>
                <button onClick={handleRecognize} disabled={isCanvasEmpty} className="w-2/3 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                    수식 인식하기
                </button>
            </div>
        </div>
    );
  };
  
  return (
    <div className="flex-grow w-full md:w-2/3 bg-white dark:bg-gray-800 flex flex-col">
      {renderContent()}
    </div>
  );
};

export default MainPanel;