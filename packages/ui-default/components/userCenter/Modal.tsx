import React, { PropsWithChildren, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import CloseIcon from "vj/misc/icons/white-crossing.svg?react";

import "./Modal.style.css";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";

interface ModalProps {
  title?: string;
  footer?: React.ReactNode;
  open: boolean;
  isModal?: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Modal: React.FC<PropsWithChildren<ModalProps>> = ({
  open,
  onOpenChange,
  title,
  footer,
  children,
  isModal,
}) => {
  return (
    <Dialog.Root modal={isModal} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-main">
          <div className="modal-title-container">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            <Dialog.Close className="modal-close-icon">
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="modal-content">{children}</div>
          <div className="modal-footer">{footer}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const showModal = (
  props: Omit<Parameters<typeof Modal>[0], "open" | "onOpenChange">,
) => {
  const div = document.createElement("div");
  div.style.display = "none";
  document.body.appendChild(div);
  const root = createRoot(div);

  const ModalElement = () => {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
      if (!isOpen) {
        root.unmount();
        setTimeout(() => {
          div.remove();
        });
      }
    }, [isOpen]);

    return (
      <Modal
        {...props}
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
      />
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
};
