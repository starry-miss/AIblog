import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { UserProvider } from './hooks/useUser';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import BlogEditor from './pages/BlogEditor';
import AIGenerator from './pages/AIGenerator';
import FileManager from './pages/FileManager';
import FilePreview from './pages/FilePreview';
import CategoryManager from './pages/CategoryManager';
import Settings from './pages/Settings';

function App() {
  return (
    <HelmetProvider>
      <UserProvider>
        <BrowserRouter>
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/new" element={<BlogEditor />} />
              <Route path="/blog/:id/edit" element={<BlogEditor />} />
              <Route path="/blog/:id" element={<BlogDetail />} />
              <Route path="/ai-generator" element={<AIGenerator />} />
              <Route path="/categories" element={<CategoryManager />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/files/:id/preview" element={<FilePreview />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
      </UserProvider>
    </HelmetProvider>
  );
}

export default App;
