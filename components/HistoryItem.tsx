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

const HistoryItem: React.FC<HistoryItemProps> = ({ entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const problemRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (problemRef.current && window.katex) {
      try {
        const html = window.katex.renderToString(entry.problemLatex, {
            throwOnError: false,
            displayMode: false, // Use inline mode for preview
        });
        problemRef.current.innerHTML = html;
      } catch(e) {
        console.error("KaTeX rendering error in history item:", e);
        if (problemRef.current) {
            problemRef.current.textContent = entry.problemLatex;
        }
      }
    }
  }, [entry.problemLatex]);
  
  useEffect(() => {
    if (isExpanded && feedbackRef.current && window.marked) {
      feedbackRef.current.innerHTML = window.marked.parse(entry.aiFeedback);
    }
  }, [isExpanded, entry.aiFeedback]);

  const formattedDate = new Date(entry.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <li className="p-4 sm:p-6 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left focus:outline-none">
        <div className="flex justify-between items-center">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 pr-2" ref={problemRef}></div>
            <svg className={`w-5 h-5 flex-shrink-0 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</p>
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">나의 풀이</h4>
            <p className="whitespace-pre-wrap mt-2 text-sm text-gray-700 dark:text-gray-300">{entry.userSolution}</p>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">AI 피드백</h4>
            <div ref={feedbackRef} className="prose prose-sm dark:prose-invert max-w-none mt-2"></div>
          </div>
        </div>
      )}
    </li>
  );
};

export default HistoryItem;