import { Routes, Route } from 'react-router-dom';
import SetupScreen from './components/SetupScreen';
import MemoryExperience from './components/MemoryExperience';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SetupScreen />} />
      <Route path="/view" element={<MemoryExperience />} />
    </Routes>
  );
}
