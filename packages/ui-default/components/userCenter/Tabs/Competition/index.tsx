import { Table, TableProps, Tabs, TabsProps } from "antd";
import React from "react";
import useUrlSearch from "../../Hooks/useUrlSearch";
import { useAntdTable } from "ahooks";
import axios from "axios";
import dayjs from "dayjs";

const tabItems: TabsProps["items"] = [
  {
    key: "all",
    label: "全部",
  },
  {
    key: "incoming",
    label: "即将开始",
  },
  {
    key: "following",
    label: "已关注",
  },
  {
    key: "inProgress",
    label: "进行中",
  },
  {
    key: "finished",
    label: "已结束",
  },
];

const tableColumns: TableProps["columns"] = [
  {
    title: "状态",
  },
  {
    title: "比赛名称",
    dataIndex: "name",
    render(value, record) {
      return (
        <a
          href={`/contest/${record.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
        </a>
      );
    },
  },
  {
    title: "比赛时间",
    render(_, record) {
      return (
        <div>
          {dayjs(record.beginAt).format("YYYY-MM-DD HH:mm:ss")}
          {` ~ `}
          {dayjs(record.endAt).format("YYYY-MM-DD HH:mm:ss")}
        </div>
      );
    },
  },
  {
    title: "题数",
    render(_, record) {
      return record.pids.length;
    },
  },

  {
    title: "举办者",
    dataIndex: "host",
  },
];

const transformData = (data: any) => {
  return {
    id: data._id as string,
    name: data.title as string,
    beginAt: new Date(data.beginAt),
    endAt: new Date(data.endAt),
    pids: data.pids as number[],
    host: data.owner as number,
  };
};

const Competition = () => {
  const [curTab, setCurTab] = useUrlSearch("competitionTab", {
    defaultValue: tabItems[0].key,
    validator: (val) => {
      return tabItems.map((item) => item.key).includes(val);
    },
  });

  const { tableProps } = useAntdTable(async ({ current }) => {
    const { data, status } = await axios.get(`${UiContext.cdn_prefix}contest`, {
      headers: {
        Accept: "application/json",
      },
      params: {
        page: current,
      },
    });
    if (status === 200 && data.tdocs?.length > 0) {
      const listData = data.tdocs.map(transformData);
      console.log(listData);
      return {
        total: data.tpcount,
        list: listData,
      };
    }
  });

  return (
    <div>
      <Tabs items={tabItems} activeKey={curTab} onChange={setCurTab} />
      <Table
        rowKey="id"
        className="custom-antd-table"
        columns={tableColumns}
        {...tableProps}
      />
    </div>
  );
};

export default Competition;
