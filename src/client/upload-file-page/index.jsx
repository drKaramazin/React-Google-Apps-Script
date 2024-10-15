import { createRoot } from 'react-dom/client';
import UploadFilePage from './components/UploadFilePage';

import './styles.css';

const container = document.getElementById('index');
const root = createRoot(container);
root.render(<UploadFilePage />);
