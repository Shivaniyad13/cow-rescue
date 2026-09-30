import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider } from './context/ConfigContext';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import ReportCow from './pages/ReportCow';
import TrackCase from './pages/TrackCase';
import CaseDetails from './pages/CaseDetails';
import AlertPage from './pages/AlertPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<ReportCow />} />
            <Route path="/track" element={<TrackCase />} />
            <Route path="/track/:caseId" element={<CaseDetails />} />
            <Route path="/alerts/:token" element={<AlertPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;