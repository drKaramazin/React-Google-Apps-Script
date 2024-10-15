import { useRef, useState } from 'react';
import UploadFile from './upload-file';
import { serverFunctions } from '../../utils/serverFunctions';

const STATUS_CHECK_INTERVAL = 4000;
const STATUS_CHECK_LIMIT = 20;

const checkStatus = (threadId, runId) => {
  return new Promise((resolve, reject) => {
    let intervalLock = false;
    let count = 0;
    const interval = setInterval(async () => {
      if (!intervalLock) {
        intervalLock = true;
        const response = await serverFunctions.status(threadId, runId);
        intervalLock = false;
        if (response.status === 'completed') {
          clearInterval(interval);
          resolve('completed');
        }
      }
      count += 1;
      if (count > STATUS_CHECK_LIMIT) {
        clearInterval(interval);
        // eslint-disable-next-line prefer-promise-reject-errors
        reject('Status checking: limit exceeded');
      }
    }, STATUS_CHECK_INTERVAL);
  });
};

const analizeMessages = (messages) => {
  const message = messages.data.find((item) => item.role === 'assistant');
  if (message && message?.content?.length) {
    return message.content[0].text.value.split(/\n+/);
  }
  throw new Error('An assistant message was not found');
};

const UploadFilePage = () => {
  const uploadRef = useRef();

  const [pdfFile, setPdfFile] = useState(undefined);
  const [runStatus, setRunStatus] = useState(undefined);
  const [error, setError] = useState(undefined);

  const uploadFile = async (file) => {
    setPdfFile(file);
  };

  const handleAnalyzeButton = async () => {
    setRunStatus('queued');
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('purpose', 'assistants');

    const fetchOptions = {
      method: 'post',
      body: formData,
      headers: await serverFunctions.authHeader(),
    };

    try {
      const filesResponse = await fetch(
        'https://api.openai.com/v1/files',
        fetchOptions
      );
      if (!filesResponse.ok) {
        throw new Error(`Response status: ${filesResponse.status}`);
      }

      const fileId = (await filesResponse.json()).id;
      const response = await serverFunctions.analyze(fileId);
      await checkStatus(response.threadId, response.runId);
      const messages = await serverFunctions.messages(response.threadId);
      await serverFunctions.placeSlides(analizeMessages(messages));
      setRunStatus('completed');
    } catch (e) {
      setRunStatus(undefined);
      console.error(e);
      setError(e);
    }
  };

  return (
    <div>
      <h2>PDF to Slides</h2>

      {(runStatus === 'completed' || !runStatus) && (
        <UploadFile
          ref={uploadRef}
          onUpload={(file) => uploadFile(file)}
        ></UploadFile>
      )}

      {(runStatus === 'completed' || !runStatus) && (
        <button
          onClick={() => handleAnalyzeButton()}
          type="button"
          className="btn btn-outline-primary"
          disabled={!pdfFile}
        >
          Generate Slide Deck
        </button>
      )}

      {runStatus && runStatus !== 'completed' && (
        <div>Generation in progress...</div>
      )}

      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default UploadFilePage;
