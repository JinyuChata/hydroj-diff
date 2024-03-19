import { Table, TableProps } from "antd";
import FilterForm from "./FilterForm";
import React from "react";

const trainAllTableColumns: TableProps["columns"] = [
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
  },
  {
    title: "题目",
    dataIndex: "question",
    key: "question",
  },
  {
    title: "递交者",
    dataIndex: "submitter",
    key: "submitter",
  },
  {
    title: "时间",
    dataIndex: "time",
    key: "time",
  },
  {
    title: "内存",
    dataIndex: "memory",
    key: "memory",
  },
  {
    title: "语言",
    dataIndex: "language",
    key: "language",
  },
  {
    title: "递交时间",
    dataIndex: "submitTime",
    key: "submitTime",
  },
];

const TrainAll = () => {
  return (
    <div>
      <FilterForm />
      <Table columns={trainAllTableColumns} size="small" />
    </div>
  );
};

export default TrainAll;
