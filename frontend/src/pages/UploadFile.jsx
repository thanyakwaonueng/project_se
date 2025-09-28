import React, { useState } from 'react';
import axios from 'axios';

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadedUrl(null); // reset previous upload
  };

  const handleUpload = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์ก่อน');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);

      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.url) {
        setUploadedUrl(res.data.url);
        setCaption(''); // optional: clear caption after upload
        setFile(null);
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดขณะอัปโหลด');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '24px auto', padding: 16 }}>
      <h2>อัปโหลดไฟล์</h2>

      <div style={{ marginBottom: 12 }}>
        <input type="file" onChange={handleFileChange} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="btn btn-primary"
      >
        {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
      </button>

      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}

      {uploadedUrl && (
        <div style={{ marginTop: 20 }}>
          <h4>ไฟล์ที่อัปโหลดสำเร็จ:</h4>
          <img src={uploadedUrl} alt="uploaded" style={{ maxWidth: '100%' }} />
        </div>
      )}
    </div>
  );
}


