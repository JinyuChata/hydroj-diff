import React from "react";
import WalletIcon from "vj/misc/icons/account-wallet.svg?react";

import "./Overview.style.css";
import { Button, ConfigProvider } from "antd";
import { showModal } from "../../Modal";
import { showRechargeModal } from "./RechargeModal";
import { CustomFormItem } from "../Train/FilterForm";

import CardRechargeIcon from "vj/misc/icons/card-recharge-icon.svg?react";
import RechargeForOthersIcon from "vj/misc/icons/recharge-for-others.svg?react";

interface CardProps {
  className?: string;
  title: string;
  icon?: React.ReactNode;
  buttonText: string;
  buttonColor?: string;
  onClickButton?: () => void;
}

const Card: React.FC<CardProps> = ({
  className,
  title,
  icon,
  buttonText,
  buttonColor = "#FF7D37",
  onClickButton,
}) => {
  return (
    <div className={`balance-add-card ${className}`}>
      <div className="left-icon-bg">{icon}</div>
      <div className="right-text">
        <div className="right-title">{title}</div>
        <ConfigProvider theme={{ token: { colorPrimary: buttonColor } }}>
          <Button
            type="primary"
            onClick={onClickButton}
            style={{ lineHeight: 0, padding: "10px 50px" }}
          >
            {buttonText}
          </Button>
        </ConfigProvider>
      </div>
    </div>
  );
};

const CardContent: Parameters<typeof Card>[0][] = [
  {
    title: "充值卡充值",
    buttonText: "立即充值",
    buttonColor: "#2D7AB3",
    className: "aqua",
    icon: <CardRechargeIcon />,
    onClickButton: () => {
      showModal({
        title: "充值卡充值",
        footer: (
          <Button
            type="primary"
            style={{ padding: "10px 50px", lineHeight: 0 }}
          >
            确定充值
          </Button>
        ),
        children: (
          <div className="card-recharge-modal">
            <CustomFormItem label="请输入充值卡号" type="input" />
            <CustomFormItem label="请输入充值卡密码" type="input" />
          </div>
        ),
      });
    },
  },
  {
    title: "给别人充值",
    buttonText: "代充值",
    className: "orange for-others",
    icon: <RechargeForOthersIcon />,
    onClickButton: () => {
      showModal({
        title: "给别人充值",
        footer: (
          <Button
            type="primary"
            style={{ padding: "10px 50px", lineHeight: 0 }}
          >
            确定充值
          </Button>
        ),
        children: (
          <div className="card-recharge-modal">
            <CustomFormItem label="请输入充值的UID" type="input" />
          </div>
        ),
      });
    },
  },
];

const Overview = () => {
  return (
    <div>
      <div className="balance-banner">
        <div className="left-icon">
          <WalletIcon />
        </div>
        <div className="balance-main">
          <div className="balance-title">魅值余额</div>
          <div className="balance-value">
            <span className="balance-number">10000</span>
            <span className="balance-unit">点</span>
          </div>
        </div>
        <div className="balance-add">
          <Button
            type="primary"
            style={{ padding: "10px 50px", lineHeight: 0 }}
            onClick={showRechargeModal}
          >
            充值
          </Button>
        </div>
      </div>
      <div className="balance-other-cards">
        {CardContent.map((item) => (
          <Card {...item} key={item.title} />
        ))}
      </div>
    </div>
  );
};

export default Overview;
