import * as Dialog from "@radix-ui/react-dialog";
import { Button, ConfigProvider } from "antd";
import React, {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { NamedPage } from "vj/api";
import CommonWrapper from "vj/components/userCenter/CommonWrapper";
import { setSearch } from "vj/components/userCenter/Hooks/useUrlSearch";
import SideTab from "vj/components/userCenter/SideTab";
import Account from "vj/components/userCenter/Tabs/Account";
import Competition from "vj/components/userCenter/Tabs/Competition";
import HomeworkList from "vj/components/userCenter/Tabs/HomeworkList";
import {
  showEditModal,
  EditModalContextType,
} from "vj/components/userCenter/Tabs/HomeworkList/EditModal";
import { ListItemType } from "vj/components/userCenter/Tabs/HomeworkList/HomeworkItem";
import PersonalSetting from "vj/components/userCenter/Tabs/PersonalSetting";
import Train from "vj/components/userCenter/Tabs/Train";
import Title from "vj/components/userCenter/Title";

export type PuzzleListModeType = "list" | "detail" | "delete" | "import";
type PuzzleListCtxType = ListItemType;

const Page = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChangeTab = (index: number) => {
    setCurrentTab(index);
    const search = new URLSearchParams(window.location.search);
    search.set("tab", index.toString());
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${search.toString()}`,
    );
  };

  const handleCreatePuzzleList = () => {
    showEditModal({
      onConfirm: (ctx) => {
        setSearch(
          { key: "homeworkDisplayMode", val: "import" },
          { key: "tdCtx", val: JSON.stringify(ctx) },
        );
      },
    });
  };

  const Tabs = useMemo<
    {
      label: string;
      value: string;
      component?: JSX.Element;
    }[]
  >(
    () => [
      {
        label: "我的训练",
        value: "my_train",
        component: <Train />,
      },
      {
        label: "我的题单",
        value: "my_list",
        component: <HomeworkList />,
      },
      {
        label: "我的比赛",
        value: "my_competition",
        component: <Competition />,
      },
      {
        label: "我的账号",
        value: "my_account",
        component: <Account />,
      },
      {
        label: "个人设置",
        value: "my_setting",
        component: <PersonalSetting />,
      },
    ],
    [],
  );

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    try {
      const curTab = parseInt(search.get("tab") || "0");
      if (curTab < 0 || curTab >= Tabs.length) throw new Error();
      setCurrentTab(curTab);
    } catch {
      handleChangeTab(0);
    }
  }, []);

  return (
    <CommonWrapper>
      <Dialog.Root>
        <div>
          <Title>我的空间</Title>
          <div className="container">
            <div>
              {Tabs.map((tab, index) => (
                <SideTab
                  onClick={() => handleChangeTab(index)}
                  isActive={currentTab === index}
                  key={tab.value}
                >
                  {tab.label}
                </SideTab>
              ))}
            </div>
            <div className="user_center_right_panel">
              <div className="sub-title-wrapper">
                <p className="sub-title">{Tabs[currentTab].label}</p>
                {currentTab === 1 && (
                  <Button type="primary" onClick={handleCreatePuzzleList}>
                    创建题单
                  </Button>
                )}
              </div>
              {Tabs[currentTab].component}
            </div>
          </div>
        </div>
      </Dialog.Root>
    </CommonWrapper>
  );
};

export default new NamedPage("user_center", () => {
  createRoot(document.getElementById("user_center_react_root")).render(
    <Page />,
  );
});
