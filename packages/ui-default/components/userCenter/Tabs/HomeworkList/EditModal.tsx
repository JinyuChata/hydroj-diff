import React, { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import CloseIcon from "vj/misc/icons/white-crossing.svg?react";

import "./EditModal.style.css";
import { CustomFormItem } from "../Train/FilterForm";
import { Button, ConfigProvider, Form, Input } from "antd";
import { Modal } from "../../Modal";
import { createRoot } from "react-dom/client";
import { ListItemType } from "./HomeworkItem";

export type EditModalContextType = ListItemType;

export const showEditModal = (config: {
  info?: EditModalContextType;
  isLocked?: boolean;
  onConfirm?: (value: EditModalContextType) => void;
  onEditMore?: () => void;
}) => {
  const { info: ctx, isLocked, onConfirm, onEditMore } = config;

  const div = document.createElement("div");
  div.style.display = "none";
  document.body.appendChild(div);
  const root = createRoot(div);

  const ModalElement = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);

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
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
        title={`${ctx ? "编辑" : "创建"}题单`}
        footer={
          <div className="edit-modal-footer">
            <Button
              loading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                if (
                  await form
                    .validateFields()
                    .then(() => false)
                    .catch(() => true)
                ) {
                  return;
                }
                const formValues = form.getFieldsValue();
                await onConfirm?.({
                  name: formValues.name,
                  description: formValues.description,
                });
                setIsLoading(false);
                setIsOpen(false);
              }}
              type="primary"
              style={{ padding: "10px 32px", lineHeight: 0 }}
            >
              确认修改
            </Button>
            {isLocked && (
              <Button
                disabled={isLoading}
                onClick={() => {
                  onEditMore?.();
                  setIsOpen(false);
                }}
                style={{ padding: "10px 32px", lineHeight: 0 }}
              >
                修改题目
              </Button>
            )}
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={ctx}>
          <Form.Item
            name="name"
            label="题单名称"
            colon={false}
            rules={[{ required: true, message: "请输入题单名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="题单描述"
            colon={false}
            rules={[{ required: true, message: "请输入题单描述" }]}
          >
            <Input />
          </Form.Item>
        </Form>
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
};

// const EditModal: React.FC<{ info?: EditModalContextType }> = ({ info }) => {
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");

//   useEffect(() => {
//     if (info) {
//       setName(info.name);
//       setDescription(info.description);
//     }
//   }, [info]);

//   return (
//     <Dialog.Portal>
//       <Dialog.Overlay className="DialogOverlay" />
//       <Dialog.Content className="DialogContent">
//         <div className="DialogTitleContainer">
//           <Dialog.Title className="DialogTitle">
//             {info ? "编辑" : "创建"}题单
//           </Dialog.Title>
//           <Dialog.Close className="DialogClose">
//             <CloseIcon />
//           </Dialog.Close>
//         </div>
//         <div className="DialogContentMain">
//           <CustomFormItem
//             label="题单名称"
//             type="input"
//             value={name}
//             onChange={setName}
//           />
//           <CustomFormItem
//             label="题单描述"
//             type="input"
//             value={description}
//             onChange={setDescription}
//           />
//         </div>
//         <div className="DialogFooter">
//           <Dialog.Close>
//             <Button
//               type="primary"
//               style={{ padding: "10px 32px", lineHeight: 0 }}
//             >
//               确定
//             </Button>
//           </Dialog.Close>
//         </div>
//       </Dialog.Content>
//     </Dialog.Portal>
//   );
// };

// export default EditModal;
