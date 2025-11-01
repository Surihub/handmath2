export interface ProblemHistoryEntry {
  id: string;
  timestamp: string;
  problemLatex: string;
  userSolutionLatex: string;
  userMemo: string;
  aiFeedback: string;
}
