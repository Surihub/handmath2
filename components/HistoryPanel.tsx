
import React from 'react';
import type { ProblemHistoryEntry } from '../types';
import HistoryItem from './HistoryItem';

interface HistoryPanelProps {
  history: ProblemHistoryEntry[];
  clearHistory: () => void;
  isVisible: boolean;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, clearHistory, isVisible }) => {
  return (
    <aside className={`
      ${isVisible ? 'block' : 'hidden'} md:block 
      w-full md:w-1/3 flex-shrink-0 bg-gray-50 dark:bg-gray-800 
      border-r border-gray-200 dark:border-gray-700 
      flex flex-col transition-all duration-300`
    }>
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">풀이 기록</h2>
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            전체 삭제
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center p-10 text-gray-500 dark:text-gray-400">
            <p className="font-medium">아직 해결한 문제가 없습니다.</p>
            <p className="text-sm mt-2">해결한 문제들이 여기에 표시됩니다.</p>
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
