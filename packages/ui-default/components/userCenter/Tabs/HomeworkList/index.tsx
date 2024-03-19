import { Divider, List } from "antd";
import _ from "lodash";
import React, { useEffect, useState } from "react";

import "./index.style.css";
import { EditModalContextType, showEditModal } from "./EditModal";
import PuzzleListCreate, {
  PuzzleListSchema,
  defaultPenaltyRule,
  normalizeFormData,
} from "../../PuzzleList/PuzzleListCreate";
import PuzzleListItem from "../../PuzzleList/PuzzleListItem";
import { usePagination, useRequest } from "ahooks";
import axios from "axios";
import HomeworkItem, { ListItemType, transformTDoc } from "./HomeworkItem";
import HomeworkDetail from "./HomeworkDetail";
import useUrlSearch from "../../Hooks/useUrlSearch";
import { Notification } from "vj/api";
import dayjs from "dayjs";

export type PuzzleListModeType = "list" | "detail" | "delete" | "import";

export const HomeworkList: React.FC = () => {
  const [displayMode, setDisplayMode] = useUrlSearch("homeworkDisplayMode", {
    defaultValue: "list",
  });

  const [puzzleListCtx, setPuzzleListCtx] = useState<ListItemType | {}>(
    JSON.parse(
      new URLSearchParams(window.location.search).get("tdCtx") ?? "{}",
    ),
  );

  const { data, pagination, loading, refresh } = usePagination(
    async ({ current }) => {
      const { status, data } = await axios.get("/homework", {
        params: { page: current },
        headers: {
          Accept: "application/json",
        },
      });
      if (status === 200 && data) {
        return {
          total: data.tpcount as number,
          list: (data.tdocs?.map(transformTDoc) ?? []) as ListItemType[],
        };
      }
    },
  );

  const handleClickListItem = (ctx: ListItemType) => {
    setDisplayMode("detail");
    setPuzzleListCtx(ctx);
  };

  const handleEditItem = async (
    values: Partial<PuzzleListSchema>,
    tid?: string,
  ) => {
    let backfill: any;
    if (tid) {
      const { data } = await axios.get(`/homework/${tid}`, {
        params: {
          tid,
        },
        headers: {
          Accept: "application/json",
        },
      });
      backfill = data.tdoc;
    } else {
      backfill = {
        beginAt: dayjs().add(1, "day").toISOString(),
        endAt: dayjs("2999-12-31").toISOString(),
        penaltyRules: defaultPenaltyRule,
        extensionDays: 0,
        rated: false,
      };
    }
    const { data: res2 } = await axios.post(
      `/homework/${tid ? `${tid}/edit` : "create"}`,
      {
        ...normalizeFormData(backfill),
        ...normalizeFormData(values),
        extensionDays: 0,
        operation: "update",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    if (res2?.error) {
      Notification.error(res2.error?.message);
      return false;
    }
    refresh();
    Notification.success(`${tid ? "修改" : "创建"}成功`);
    if (!tid) {
      setTimeout(() => {
        window.location.href = `/user/center?tab=1&homeworkDisplayMode=detail&tid=${res2?.tid}`;
      }, 1000);
    }
    return true;
  };

  if (displayMode === "import") {
    // import: 创建模式
    return (
      <div className="homework-container">
        <Divider />
        <HomeworkItem
          {...puzzleListCtx}
          onEditMeta={setPuzzleListCtx}
          hideQNum
        />
        <Divider />
        <PuzzleListCreate
          ctx={puzzleListCtx}
          onSave={(val) => handleEditItem(val, (puzzleListCtx as any)?.tid)}
        />
      </div>
    );
  } else if (displayMode === "detail") {
    // detail: 详情模式
    return (
      <HomeworkDetail
        context={puzzleListCtx}
        onEditMeta={async (meta) => {
          return await handleEditItem(
            { title: meta.name, content: meta.description },
            (puzzleListCtx as any).tid,
          );
        }}
        onEditMore={() => setDisplayMode("delete")}
      />
    );
  } else if (displayMode === "delete") {
    // delete: 编辑和删除模式
    return (
      <HomeworkDetail
        isEditing
        context={puzzleListCtx}
        onEditMeta={async (meta) => {
          return await handleEditItem(
            { title: meta.name, content: meta.description },
            (puzzleListCtx as any).tid,
          );
        }}
        onAddQuestion={() => {
          setDisplayMode("import");
        }}
        onDelete={async (remainingPids) => {
          return await handleEditItem(
            { pids: remainingPids },
            (puzzleListCtx as any).tid,
          );
        }}
      />
    );
  } else {
    // list: 列表模式
    return (
      <div className="homework-container">
        <List
          loading={loading}
          pagination={pagination}
          dataSource={data?.list}
          renderItem={(item) => (
            <List.Item>
              <HomeworkItem
                {...item}
                showModalEdit
                onEditMeta={async (meta) => {
                  await handleEditItem(
                    { title: meta.name, content: meta.description },
                    item.tid,
                  );
                }}
                onEditContent={() => {
                  setPuzzleListCtx(item);
                  setDisplayMode("delete");
                }}
                onClick={() => handleClickListItem(item)}
              />
            </List.Item>
          )}
        />
      </div>
    );
  }
};

export default HomeworkList;
