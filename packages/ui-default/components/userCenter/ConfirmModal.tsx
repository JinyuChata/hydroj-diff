import React, { useEffect, useState } from "react";

import { Button, ConfigProvider } from "antd";
import { createRoot } from "react-dom/client";
import { Modal } from "./Modal";

export const asyncShowConfirmModal = (config: {
  title: string;
  content: string;
  cancelText?: string;
  okText?: string;
}) => {
  const { title, content, okText, cancelText } = config;

  return new Promise<boolean>((resolve) => {
    const div = document.createElement("div");
    div.style.display = "none";
    document.body.appendChild(div);
    const root = createRoot(div);

    const ModalElement = () => {
      const [isOpen, setIsOpen] = useState(true);

      useEffect(() => {
        if (!isOpen) {
          setTimeout(() => {
            root.unmount();
            div.remove();
          });
        }
      }, [isOpen]);

      return (
        <Modal
          isModal
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
          }}
          title={title}
          footer={
            <div className="edit-modal-footer">
              <Button
                onClick={() => {
                  setIsOpen(false);
                  resolve(true);
                }}
                type="primary"
                style={{ padding: "10px 32px", lineHeight: 0 }}
              >
                {okText || "确认"}
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  resolve(false);
                }}
                style={{ padding: "10px 32px", lineHeight: 0 }}
              >
                {cancelText || "取消"}
              </Button>
            </div>
          }
        >
          {content}
        </Modal>
      );
    };

    root.render(
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#FF7D37",
            colorPrimaryBorder: "#FFFFFF",
          },
        }}
      >
        <ModalElement />
      </ConfigProvider>,
    );
  });
};
