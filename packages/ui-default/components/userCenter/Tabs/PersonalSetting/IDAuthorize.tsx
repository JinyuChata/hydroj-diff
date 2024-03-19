import React, { useState } from "react";
import WarningIcon from "vj/misc/icons/red-warning.svg?react";
import OkIcon from "vj/misc/icons/orange-ok.svg?react";

import "./IDAuthorize.style.css";
import { Button, Form, Input } from "antd";
import { showModal } from "../../Modal";
import * as Dialog from "@radix-ui/react-dialog";

const IDAuthorize = () => {
  const [authorized, setAuthorized] = useState(false);

  const popupSuccessModal = () => {
    showModal({
      title: "实名认证成功",
      children: (
        <div className="authorize-result-modal">
          <div className="greeting-title">亲爱的{UiContext.username}：</div>
          <div>您已经开通修炼场智能刷题权限啦！</div>
          <div>快去体验吧！</div>
        </div>
      ),
      footer: (
        <Button type="primary" href="/">
          去修炼场
        </Button>
      ),
    });
  };

  const popupFailModal = () => {
    showModal({
      title: "实名认证失败",
      children: (
        <div className="authorize-result-modal">
          <div className="greeting-title">亲爱的{UiContext.username}：</div>
          <div>请仔细核对证件信息，再次进行认证！</div>
          <div>注意身份证号码内如有字母请大写。</div>
        </div>
      ),
      footer: (
        <Dialog.Close asChild>
          <Button type="primary">确认</Button>
        </Dialog.Close>
      ),
    });
  };

  return (
    <div>
      <div
        className={`top-alarm ${authorized ? "authorized" : "unauthorized"}`}
      >
        {authorized ? <OkIcon /> : <WarningIcon />}
        <span>
          {authorized
            ? "已完成实名认证"
            : "请进行实名认证解锁CODEMATE的基本功能 ！"}
        </span>
      </div>
      <Form layout="horizontal" labelCol={{ span: 4 }} disabled={authorized}>
        <Form.Item label="姓名" name="name">
          <Input />
        </Form.Item>
        <Form.Item label="身份证号码" name="id">
          <Input />
        </Form.Item>
        {!authorized && (
          <Form.Item wrapperCol={{ offset: 4 }}>
            <Button
              type="primary"
              htmlType="submit"
              onClick={() => {
                popupSuccessModal();
                setAuthorized(true);
              }}
            >
              提交认证
            </Button>
          </Form.Item>
        )}
      </Form>
    </div>
  );
};

export default IDAuthorize;
