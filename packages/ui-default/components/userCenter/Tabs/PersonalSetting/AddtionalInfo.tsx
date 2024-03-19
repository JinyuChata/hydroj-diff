import { Button, Form, Input, Select } from "antd";
import React from "react";

const AddtionalInfo = () => {
  return (
    <Form labelCol={{ span: 4 }}>
      <Form.Item label="性别" name="gender">
        <Select>
          <Select.Option value="male">男</Select.Option>
          <Select.Option value="female">女</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="所在学校" name="school">
        <Input />
      </Form.Item>
      <Form.Item label="所在年级" name="grade">
        <Input />
      </Form.Item>
      <Form.Item label="家长电话" name="parentPhone">
        <Input />
      </Form.Item>
      <Form.Item label="重点关注" name="following">
        <Input />
      </Form.Item>
      <Form.Item label="核心诉求" name="coreAppeal">
        <Input.TextArea />
      </Form.Item>
      <Form.Item label="当前学习阶段" name="currentStage">
        <Input />
      </Form.Item>
      <Form.Item label="学术层" name="academicLayer">
        <Input />
      </Form.Item>
      <Form.Item wrapperCol={{ offset: 4 }}>
        <Button type="primary" htmlType="submit">
          保存修改
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AddtionalInfo;
