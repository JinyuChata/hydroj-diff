import { Table, TableProps, Tabs, TabsProps } from "antd";
import React from "react";
import useUrlSearch from "../../Hooks/useUrlSearch";
import PersonalInfo from "./PersonalInfo";
import IDAuthorize from "./IDAuthorize";
import AddtionalInfo from "./AddtionalInfo";
import Achievements from "./Achievements";

const tabItems: TabsProps["items"] = [
  {
    key: "info",
    label: "个人信息",
    children: <PersonalInfo />,
  },
  {
    key: "authorize",
    label: "实名认证",
    children: <IDAuthorize />,
  },
  {
    key: "additional",
    label: "拓展信息",
    children: <AddtionalInfo />,
  },
  {
    key: "achievements",
    label: "成就",
    children: <Achievements />,
  },
];

const PersonalSetting = () => {
  const [curTab, setCurTab] = useUrlSearch("personalTab", {
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

export default PersonalSetting;
