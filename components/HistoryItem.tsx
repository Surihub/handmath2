import React, { useState, useEffect, useRef } from 'react';
import type { ProblemHistoryEntry } from '../types';

declare global {
  interface Window {
    katex: any;
    marked: any;
  }
}

interface HistoryItemProps {
  entry: ProblemHistoryEntry;
}

const renderLatexInRef = (ref: React.RefObject<HTMLElement>, latex: string, options: object) => {
    if (ref.current && window.katex) {
      try {
        window.katex.render(latex, ref.current, { ...options, throwOnError: false });
      } catch(e) {
        console.error("KaTeX rendering error:", e);
        if (ref.current) {
            ref.current.textContent = latex;
        }
      }
    }
};

const renderMarkdownInRef = (ref: React.RefObject<HTMLElement>, markdown: string) => {
    if (ref.current && window.marked) {
        ref.current.innerHTML = window.marked.parse(markdown);
    }
};

const HistoryItem: React.FC<HistoryItemProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const problemRef = useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
        renderLatexInRef(problemRef, entry.problemLatex, { displayMode: false });
        renderLatexInRef(solutionRef, entry.userSolutionLatex, { displayMode: false });
        renderMarkdownInRef(feedbackRef, entry.aiFeedback);
    }
  }, [isExpanded, entry]);

  const formattedDate = new Date(entry.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  const problemPreview = entry.problemLatex.substring(0, 40) + '...';

  return (
    <li className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left focus:outline-none">
        <div className="flex justify-between items-start">
            <div className="flex-grow pr-4">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{problemPreview}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</p>
            </div>
            <svg className={`w-5 h-5 flex-shrink-0 text-gray-500 transform transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">문제</h4>
            <div ref={problemRef} className="text-sm text-gray-700 dark:text-gray-300 mt-1"></div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">나의 풀이</h4>
            <div ref={solutionRef} className="text-sm text-gray-700 dark:text-gray-300 mt-1"></div>
          </div>
          {entry.userMemo && (
             <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">나의 메모</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{entry.userMemo}</p>
             </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">AI 피드백</h4>
            <div ref={feedbackRef} className="prose prose-sm dark:prose-invert max-w-none mt-2"></div>
          </div>
        </div>
      )}
    </li>
  );
};

export default HistoryItem;
