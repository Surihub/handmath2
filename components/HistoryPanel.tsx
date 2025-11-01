import React from 'react';
import type { ProblemHistoryEntry } from '../types';
import HistoryItem from './HistoryItem';

interface HistoryPanelProps {
  history: ProblemHistoryEntry[];
  clearHistory: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory }) => {
  return (
    <aside className="hidden md:flex w-full md:w-80 lg:w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 flex-col bg-white dark:bg-gray-800">
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">풀이 기록</h2>
            <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">{history.length}</span>
        </div>
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            전체 삭제
          </button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-10 px-4 text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
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
    </aside>
  );
};

export default HistoryPanel;