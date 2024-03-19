import { Table, TableProps } from "antd";
import React from "react";

const tableColumns: TableProps["columns"] = [
  {
    title: "购买项目",
    dataIndex: "project",
    key: "project",
  },
  {
    title: "消耗魅值",
    dataIndex: "value",
    key: "value",
  },
  {
    title: "时间",
    dataIndex: "time",
    key: "time",
  },
  {
    title: "购买内容",
    dataIndex: "content",
    key: "content",
  },
];

const PurchasedTable = () => {
  return (
    <Table className="custom-antd-table" columns={tableColumns} size="small" />
  );
};

export default PurchasedTable;
