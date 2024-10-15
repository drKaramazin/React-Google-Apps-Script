import { useId } from 'react';

const UploadFile = ({ onUpload }) => {
  const id = useId();

  const handleFileChange = (event) => {
    onUpload(event.target.files[0]);
  };

  return (
    <div className="form-group">
      <input
        type="file"
        className="form-control-file"
        id={id}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default UploadFile;
