import React, { useRef, useState } from "react";
import { useInfiniteScroll, useLockFn } from "ahooks";

import "./Records.style.css";
import { Button, Table, TableProps } from "antd";
import axios from "axios";
import { STATUS_ACCEPTED, STATUS_TEXTS } from "vj/constant/record";
import { getTimeDiffFromNow } from "../../Hooks/useTimeDiff";

const Categories = ["客观题", "编程题"];

const tableColumns: TableProps["columns"] = [
  {
    title: "编号",
    dataIndex: "pid",
    render(value) {
      return `P${"0".repeat(5 - value.toString().length)}${value}`;
    },
  },
  {
    title: "题目名称",
    dataIndex: "name",
    render(value, record) {
      return (
        <a
          href={`/record/${record.rid}`}
          target="_blank"
          className="record-item-title"
        >
          {value}
        </a>
      );
    },
  },
  {
    title: "算法标签",
    dataIndex: "tags",
    render(value) {
      return (
        <div className="record-item-tags-container">
          {value.map((tag) => (
            <div className="record-item-tag">{tag}</div>
          ))}
        </div>
      );
    },
  },
  {
    title: "难度",
    dataIndex: "difficulty",
  },
  {
    title: "评测结果",
    dataIndex: "result",
    render(value, record) {
      return (
        <span
          style={{ color: value === STATUS_ACCEPTED ? "#01FA05" : "#FF7D37" }}
        >
          {record["lang"] !== "_"
            ? record.score
            : value === STATUS_ACCEPTED
              ? "正确"
              : "错误"}
        </span>
      );
    },
  },
  {
    title: "平均AC",
    dataIndex: "acPercentage",
    render(value) {
      return `${(value * 100).toFixed()}%`;
    },
  },
  {
    title: "答题时间",
    dataIndex: "submitAt",
    render: (value) => getTimeDiffFromNow(value),
  },
];

const transformData = (data: any, pdict: any) => {
  const question = pdict[data.pid];
  return {
    pid: data.pid,
    name: question.title,
    tags: question.tag,
    result: data.status,
    score: data.score,
    lang: data.lang,
    acPercentage: question.nAccept / question.nSubmit,
    duration: data.time,
    rid: data._id,
    submitAt: new Date(data.judgeAt),
    difficulty: question.difficulty,
  };
};

const Records = () => {
  const [selectedCategory, setSelectedCategory] = useState(0);

  const { data, loadingMore, loading, loadMore, noMore } = useInfiniteScroll(
    async (d) => {
      const current = d?.currentPage ?? 1;
      const { data, status } = await axios.get(
        `${UiContext.cdn_prefix}record`,
        {
          headers: {
            Accept: "application/json",
          },
          params: {
            uidOrName: UserContext._id,
            page: current,
            lang: selectedCategory === 0 ? "_" : undefined,
            full: true,
          },
        },
      );
      if (status === 200 && data.rdocs?.length > 0) {
        const listData = data.rdocs
          .map((i: any) => transformData(i, data.pdict))
          .filter((i) => {
            if (selectedCategory === 0) return true;
            return i.lang !== "_";
          })
          .sort((a, b) => b.submitAt.getTime() - a.submitAt.getTime());
        return {
          list: listData,
          currentPage: current + 1,
          prevLen: d?.list?.length ?? 0,
        };
      } else {
        return {
          list: [],
          hasNoMore: true,
        };
      }
    },
    {
      reloadDeps: [selectedCategory],
      isNoMore: (data) => data?.hasNoMore,
    },
  );

  return (
    <div>
      <div className="record-categories">
        {Categories.map((item, index) => (
          <div
            onClick={() => {
              setSelectedCategory(index);
            }}
            className={`record-category-item ${index === selectedCategory ? "selected" : ""}`}
            key={item}
          >
            {item}
          </div>
        ))}
      </div>
      <Table
        className="custom-antd-table"
        columns={tableColumns}
        loading={loading}
        pagination={false}
        dataSource={data?.list ?? []}
      />
      {!loading && (
        <div className="load-more-btn">
          <Button onClick={loadMore} disabled={noMore} loading={loadingMore}>
            {noMore ? "没有更多记录" : "加载更多"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Records;
