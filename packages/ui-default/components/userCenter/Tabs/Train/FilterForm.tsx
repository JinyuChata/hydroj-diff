import { Button, Form, Input, Select } from "antd";
import React, { CSSProperties } from "react";

import "./FilterForm.style.css";

interface IProps<T = any> {
  type: "input" | "select";
  label?: string;
  value?: T;
  style?: CSSProperties;
  onChange?: (v: T) => void;
}

export const CustomFormItem: React.FC<IProps> = ({
  type,
  label,
  value,
  style,
  onChange,
}) => {
  return (
    <div className="custom-antd-form-item">
      <p className="custom-label">{label}</p>
      {type === "input" ? (
        <Input style={style} value={value} onChange={onChange} />
      ) : (
        <Select style={style} value={value} onChange={onChange} />
      )}
    </div>
  );
};

const FilterForm = () => {
  const [filterForm] = Form.useForm();

  return (
    <>
      <div className="filter-form-header">
        <div>过滤</div>
        <Button type="primary" style={{ padding: "7px 24px", lineHeight: 0 }}>
          过滤
        </Button>
      </div>
      <div className="filter-form-main">
        <Form form={filterForm} layout="inline">
          <Form.Item>
            <CustomFormItem label="由用户名或UID" type="input" />
          </Form.Item>
          <Form.Item>
            <CustomFormItem label="由题目" type="input" />
          </Form.Item>
          <Form.Item>
            <CustomFormItem label="由比赛" type="input" />
          </Form.Item>
          <Form.Item>
            <CustomFormItem label="由语言" type="select" />
          </Form.Item>
        </Form>
      </div>
    </>
  );
};

export default FilterForm;
