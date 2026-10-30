import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { CommandCenterPage } from './pages/CommandCenterPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { DocumentIntelligencePage } from './pages/DocumentIntelligencePage';
import { RequirementExplorerPage } from './pages/RequirementExplorerPage';
import { EvidenceMappingPage } from './pages/EvidenceMappingPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { DependencyGraphPage } from './pages/DependencyGraphPage';
import { RevisionIntelligencePage } from './pages/RevisionIntelligencePage';
import { EvidenceSufficiencyPage } from './pages/EvidenceSufficiencyPage';
import { RiskIntelligencePage } from './pages/RiskIntelligencePage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { WhatIfSimulatorPage } from './pages/WhatIfSimulatorPage';
import { StandardsPage } from './pages/StandardsPage';
import { AssistantPage } from './pages/AssistantPage';
import { AuditPage } from './pages/AuditPage';
import { EvaluationLabPage } from './pages/EvaluationLabPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';

import { ErrorBoundary } from './components/common/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<CommandCenterPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/analysis/new" element={<NewAnalysisPage />} />
          
          <Route path="/documents" element={<DocumentIntelligencePage />} />
          <Route path="/requirements" element={<RequirementExplorerPage />} />
          <Route path="/mapping" element={<EvidenceMappingPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/graph" element={<DependencyGraphPage />} />
          
          <Route path="/revisions" element={<RevisionIntelligencePage />} />
          <Route path="/sufficiency" element={<EvidenceSufficiencyPage />} />
          <Route path="/risk" element={<RiskIntelligencePage />} />
          <Route path="/review-queue" element={<ReviewQueuePage />} />
          <Route path="/simulator" element={<WhatIfSimulatorPage />} />
          
          <Route path="/standards" element={<StandardsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/evaluation" element={<EvaluationLabPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </AppLayout>
    </BrowserRouter>
  );
}

