import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GeneratePassword } from './pages/GeneratePassword';
import { Generate2FA } from './pages/Generate2FA';
import { AuthUser } from './pages/AuthUser';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<GeneratePassword />} />
          <Route path="generate-2fa" element={<Generate2FA />} />
          <Route path="auth" element={<AuthUser />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

