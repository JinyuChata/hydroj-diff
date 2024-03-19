import { Button, Divider, List } from "antd";
import React, { useEffect, useState } from "react";
import HomeworkItem, { ListItemType } from "./HomeworkItem";
import PuzzleListItem from "../../PuzzleList/PuzzleListItem";
import axios from "axios";
import { useRequest } from "ahooks";
import useUrlSearch from "../../Hooks/useUrlSearch";

import "./HomeworkDetail.style.css";
import { asyncShowConfirmModal } from "../../ConfirmModal";
import { Notification } from "vj/api";

interface IProps {
  context: ListItemType;
  isEditing?: boolean;
  onEditMeta?: (item: ListItemType) => Promise<boolean>;
  onEditMore?: () => void;
  onAddQuestion?: () => void;
  onDelete?: (remainingPids?: number[]) => Promise<boolean>;
}

const HomeworkDetail: React.FC<IProps> = ({
  onEditMeta,
  onEditMore,
  onAddQuestion,
  onDelete,
  context,
  isEditing,
}) => {
  const [tid] = useUrlSearch("tid", {
    defaultValue: context?.tid,
  });
  const [tdCtx, setTdCtx] = useUrlSearch("tdCtx", {
    defaultValue: JSON.stringify(context),
  });

  const [selected, setSelected] = useState<number[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);

  const {
    data: questions,
    loading: isQuestionsLoading,
    refresh,
  } = useRequest(
    async () => {
      const { status, data } = await axios.get(`/homework/${tid}`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (status === 200 && data) {
        return data.tdoc.pids?.map((i) => ({
          pid: i,
          name: data.pdict[i]?.title,
        })) as ListItemType[];
      }
    },
    {
      refreshDeps: [tid],
    },
  );

  const handleRefresh = async () => {
    try {
      await refresh();
      const { data, status } = await axios.get(`/homework/${tid}`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (status === 200 && data.tdoc) {
        setTdCtx(
          JSON.stringify({
            name: data.tdoc.title,
            pids: data.tdoc.pids,
            description: data.tdoc.content,
            tid: data.tdoc._id,
          }),
        );
      } else {
        throw new Error("Homework not found");
      }
    } catch (e) {
      console.error(e);
      Notification.error(e.message || "刷新数据失败，请退出后重试");
    }
  };

  const handleDelete = async () => {
    if (selected.length === questions.length) {
      Notification.warn("不能删除所有题目");
      return;
    }
    if (
      await asyncShowConfirmModal({
        title: "删除确认",
        content: `确认要删除以下${selected.length}道题吗？`,
      })
    ) {
      setIsRequesting(true);
      const _remaining = questions
        .filter((i) => !selected.includes(i.pid))
        .map((i) => i.pid);
      if (await onDelete?.(_remaining)) {
        setSelected([]);
        await refresh();
      }
      setIsRequesting(false);
    }
  };

  const handleEditMeta = async (val: ListItemType) => {
    if (await onEditMeta?.(val)) {
      await handleRefresh();
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [tid]);

  useEffect(() => {
    console.log(questions);
  }, [questions]);

  return (
    <div className="homework-container">
      <Divider />
      <HomeworkItem
        {...JSON.parse(tdCtx)}
        onEditMeta={handleEditMeta}
        onEditContent={onEditMore}
        hideQNum
        showModalEdit={!isEditing}
      />
      <Divider />
      {isEditing && (
        <div className="edit-btn-bar">
          <Button
            loading={isRequesting}
            disabled={selected.length === 0}
            onClick={handleDelete}
          >
            删除
          </Button>
          <Button
            disabled={isRequesting}
            onClick={onAddQuestion}
            type="primary"
          >
            添加
          </Button>
        </div>
      )}
      <div>
        <List
          className="odd-special"
          loading={isQuestionsLoading}
          dataSource={questions}
          renderItem={(item) => (
            <List.Item key={item.pid}>
              <PuzzleListItem
                {...(item as any)}
                showSelect={isEditing}
                selected={selected.includes(item.pid)}
                onSelect={(val) =>
                  setSelected(
                    val
                      ? [...selected, item.pid]
                      : selected.filter((i) => i !== item.pid),
                  )
                }
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};

export default HomeworkDetail;
