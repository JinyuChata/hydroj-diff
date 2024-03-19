import { Button, Upload } from "antd";
import React, { useEffect, useState } from "react";

import "./ImageUploader.style.css";

interface ImageUploaderProps {
  value?: File | string;
  onChange?: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange }) => {
  const [previewUrl, setPreviewUrl] = useState<string>(
    UiContext.cdn_prefix + "img/avatar.png",
  );

  useEffect(() => {
    if (value) {
      if (typeof value === "string") {
        setPreviewUrl(value);
        return;
      }
      setPreviewUrl(URL.createObjectURL(value));
    }
  }, [value]);

  return (
    <div className="image-uploader-container">
      <img src={previewUrl} alt="avatar" className="avatar-upload-preview" />
      <Upload
        accept="image/*"
        name="avatar"
        showUploadList={false}
        onChange={(info) => {
          console.log(info);
          onChange?.(info.file.originFileObj);
        }}
      >
        <Button type="primary">上传头像</Button>
      </Upload>
    </div>
  );
};

export default ImageUploader;
