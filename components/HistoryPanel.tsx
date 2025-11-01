import React, { useState } from 'react';
import type { ProblemHistoryEntry } from '../types';
import HistoryItem from './HistoryItem';

interface HistoryDrawerProps {
  history: ProblemHistoryEntry[];
  clearHistory: () => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ history, clearHistory }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10">
      <div className="w-full max-w-6xl mx-auto px-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-t-xl shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.3)] border-t border-x border-gray-200 dark:border-gray-700 transition-all duration-500"
          style={{ marginBottom: isOpen ? '0' : '-350px', maxHeight: '420px' }}
        >
          <div 
            className="p-4 flex justify-between items-center cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="flex items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">풀이 기록</h2>
                <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">{history.length}</span>
            </div>
            <div className="flex items-center">
                {history.length > 0 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline mr-4"
                  >
                    전체 삭제
                  </button>
                )}
                <svg className={`w-6 h-6 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            </div>
          </div>
          
          <div className="h-[350px] overflow-y-auto border-t border-gray-200 dark:border-gray-700">
            {history.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
                <p className="font-medium">아직 해결한 문제가 없습니다.</p>
                <p className="text-sm mt-2">AI 피드백을 받은 문제들이 여기에 표시됩니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map(entry => (
                  <HistoryItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HistoryDrawer;
