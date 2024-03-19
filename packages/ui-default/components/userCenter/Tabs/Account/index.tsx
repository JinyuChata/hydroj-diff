import { Tabs, TabsProps } from "antd";
import React from "react";
import useUrlSearch from "../../Hooks/useUrlSearch";
import Overview from "./Overview";
import Detail from "./Detail";

const tabItems: TabsProps["items"] = [
  { key: "overview", label: "账户", children: <Overview /> },
  {
    key: "details",
    label: "交易明细",
    children: <Detail />,
  },
];

const Account = () => {
  const [curTab, setCurTab] = useUrlSearch("accountTab", {
    defaultValue: tabItems[0].key,
    validator: (val) => {
      return tabItems.map((item) => item.key).includes(val);
    },
  });

  return (
    <div>
      <Tabs items={tabItems} activeKey={curTab} onChange={setCurTab} />
    </div>
  );
};

export default Account;
