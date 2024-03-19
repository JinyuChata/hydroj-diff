import React, { useEffect, useState } from "react";
import { Modal } from "../../Modal";

import "./RechargeModal.style.css";
import { createRoot } from "react-dom/client";
import { Button, ConfigProvider, Input } from "antd";
import TipIcon from "vj/misc/icons/recharge-tip.svg?react";

const SupportedAmounts = [100, 500, 1000, 3000, 10000, 50000];

export const showRechargeModal = () => {
  const div = document.createElement("div");
  div.style.display = "none";
  document.body.appendChild(div);
  const root = createRoot(div);

  const ModalElement = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [amount, setAmount] = useState<number | null>(null);

    const handleInputChange = (val: string) => {
      try {
        const amount = parseInt(val, 10);
        setSelectedIndex(null);
        setAmount(amount);
      } catch {}
    };

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
        title="在线充值"
        footer={
          <Button
            type="primary"
            style={{ padding: "10px 32px", lineHeight: 0 }}
          >
            确定
          </Button>
        }
      >
        <div className="online-recharge-modal">
          <p className="tips">
            <TipIcon />
            1元=10魅值
          </p>
          <div className="amount-card-container">
            {SupportedAmounts.map((amount, index) => (
              <div
                className={`amount-card-item ${index === selectedIndex && "selected"}`}
                onClick={() => {
                  setSelectedIndex(index);
                  setAmount(amount);
                }}
              >
                <span>{amount}魅值</span>
              </div>
            ))}
          </div>
          <div className="amount-input">
            <p className="desc-text">其他金额</p>
            <Input
              type="number"
              onChange={(e) => {
                handleInputChange(e.target.value);
              }}
            />
          </div>
          {amount && (
            <div className="alarm-text">
              订单确认：充值{amount}魅值 金额{amount}元
            </div>
          )}
        </div>
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
