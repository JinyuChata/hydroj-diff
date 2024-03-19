import { Button, ConfigProvider, Form, Input, Select, Tooltip } from "antd";
import React, { useState } from "react";
import ImageUploader from "./ImageUploader";
import HelperIcon from "vj/misc/icons/recharge-tip.svg?react";

const PersonalInfo = () => {
  const [form] = Form.useForm();
  const [shouldShowSubmit, setShouldShowSubmit] = useState(false);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);

  return (
    <div>
      <Form
        form={form}
        onChange={() => {
          setShouldShowSubmit(true);
          console.log(form.getFieldsValue(), form.getFieldsError());
          if (form.getFieldsError().some((e) => e.errors.length > 0)) {
            setIsSubmitDisabled(false);
          }
        }}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Form.Item name="avatar" label="头像">
          <ImageUploader />
        </Form.Item>
        <Form.Item
          name="nickname"
          label="昵称"
          required
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="nation"
          label="国籍"
          required
          rules={[{ required: true }]}
        >
          <Select options={[{ label: "中国", value: "中国" }]} />
        </Form.Item>
        <Form.Item
          name="age"
          label="年龄"
          required
          rules={[{ required: true }]}
        >
          <Input type="number" min={0} suffix="岁" />
        </Form.Item>
        <Form.Item
          name="is_oi"
          label="是否为现役OIer"
          required
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: "是", value: 1 },
              { label: "否", value: 0 },
            ]}
          />
        </Form.Item>
        <Form.Item
          dependencies={["is_oi"]}
          wrapperCol={{ offset: 6 }}
          className="oi-qualification"
        >
          {({ getFieldValue }) =>
            getFieldValue("is_oi") == 1 && (
              <ConfigProvider theme={{ token: { colorPrimary: "#2E77E3" } }}>
                <Button
                  shape="round"
                  type="primary"
                  style={{ fontSize: "12px", lineHeight: 0 }}
                >
                  提交证明
                </Button>
                <span className="tooltip-icon">
                  <Tooltip title="tooltip">
                    <HelperIcon />
                  </Tooltip>
                </span>
              </ConfigProvider>
            )
          }
        </Form.Item>
        {shouldShowSubmit && (
          <Form.Item
            shouldUpdate
            wrapperCol={{ offset: 6 }}
            style={{ marginTop: 40 }}
          >
            {({ getFieldsError }) => (
              <Button
                disabled={getFieldsError().some((e) => e.errors.length > 0)}
                htmlType="submit"
                type="primary"
                style={{ padding: "12px 30px", lineHeight: 0 }}
              >
                保存修改
              </Button>
            )}
          </Form.Item>
        )}
      </Form>
    </div>
  );
};

export default PersonalInfo;
