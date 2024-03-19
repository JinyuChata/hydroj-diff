import { Button, Input, List } from "antd";
import React, { useEffect } from "react";

import "./PuzzleListCreate.style.css";
import PuzzleListItem, { PuzzleListItemType } from "./PuzzleListItem";
import axios from "axios";
import { ListItemType } from "../Tabs/HomeworkList/HomeworkItem";
import { useLockFn, useRequest } from "ahooks";
import { api, gql } from "vj/utils";
import { Notification } from "vj/api";
import dayjs from "dayjs";

export interface PuzzleListSchema {
  tid?: string;
  beginAtDate: string;
  beginAtTime: string;
  penaltySinceDate: string;
  penaltySinceTime: string;
  extensionDays: number;
  penaltyRules: string;
  title: string;
  content: string;
  pids: number[];
  rated: boolean;
  maintainer?: number[];
  assign?: string[];
  operation: "update" | "delete";
}

export const defaultPenaltyRule = `# Format:
# hours: coefficient
1: 0.9
3: 0.8
12: 0.75
9999: 0.5`;

export function normalizeFormData(data: Record<string, any>) {
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key])) {
      data[key] = data[key].join(",");
    }
    if (typeof data[key] === "object") {
      data[key] = Object.entries(data[key])
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    }
    if (key === "beginAt") {
      data.beginAtDate = dayjs(data.beginAt).format("YYYY-MM-DD");
      data.beginAtTime = dayjs(data.beginAt).format("HH:mm");
      delete data.beginAt;
    }
    if (key === "endAt") {
      data.penaltySinceDate = dayjs(data.endAt).format("YYYY-MM-DD");
      data.penaltySinceTime = dayjs(data.endAt).format("HH:mm");
      delete data.endAt;
    }
    if (key === "name") {
      data.title = data.name;
      delete data.name;
    }
    if (key === "description") {
      data.content = data.description;
      delete data.description;
    }
  });
  return data;
}

interface IProps {
  ctx?: ListItemType;
  onSave?: (values: Partial<PuzzleListSchema>) => Promise<boolean>;
}

const PuzzleListCreate: React.FC<IProps> = ({ onSave, ctx }) => {
  const [questions, setQuestions] = React.useState<PuzzleListItemType[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [selectedPids, setSelectedPids] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = useLockFn(async (tid?: string) => {
    if (!tid) return;
    // 从 ctx.tid 中获取题目
    setIsLoading(true);
    await axios
      .get(`/homework/${tid}`, {
        headers: {
          Accept: "application/json",
        },
      })
      .then(({ data, status }) => {
        if (status === 200 && data) {
          return data.tdoc.pids?.map((i) => ({
            pid: i,
            name: data.pdict[i]?.title,
          }));
        }
      })
      .then((data) => {
        setQuestions(data ?? []);
      });
    setIsLoading(false);
  });

  useEffect(() => {
    refresh(ctx?.tid);
    return () => {
      const search = new URLSearchParams(window.location.search);
      search.delete("tdCtx");
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${search.toString()}`,
      );
    };
  }, [ctx?.tid]);

  const handleMultipleImport = useLockFn(async (text: string) => {
    setIsLoading(true);
    try {
      // 先删除空字符，然后按逗号分隔
      const pids = text
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item)
        .map((item) => parseInt(item));

      const {
        data: { problems },
      } = await api(
        gql`problems(ids: ${Array.from(new Set(pids))}) { title, pid }`,
      );

      setQuestions((prev) => [
        ...prev,
        ...problems.map((i) => ({ pid: i.pid, name: i.title })),
      ]);

      setTimeout(() => {
        setInputValue("");
      });
    } catch (e) {
      Notification.error("导入失败，请检查题目ID是否合法");
    } finally {
      setIsLoading(false);
    }
  });

  const handleDelete = () => {
    if (selectedPids.length) {
      setQuestions(
        questions.filter((item) => !selectedPids.includes(item.pid)),
      );
      setSelectedPids([]);
    }
  };

  const handleSubmit = async () => {
    if (!questions.length) {
      Notification.error("请选择题目");
      return;
    }
    setIsLoading(true);
    if (
      await onSave?.({
        ...ctx,
        pids: questions.map((i) => i.pid),
      })
    ) {
      await refresh();
      setSelectedPids([]);
    }
    setIsLoading(false);
  };

  return (
    <div className="import-main">
      <div className="import-type-item">
        <div className="import-bar-title">
          <div className="import-title-left">
            <div className="import-title-text batched">导入题目</div>
            <Button
              loading={isLoading}
              onClick={() => handleMultipleImport(inputValue)}
              type="primary"
            >
              确认导入
            </Button>
          </div>
          <div className="import-title-right">
            <Button onClick={handleDelete}>删除</Button>
          </div>
        </div>
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={(e) => {
            e.preventDefault();
            handleMultipleImport(inputValue);
          }}
          placeholder="请输入要导入的题号，用逗号分隔"
        />
        <p className="batch-import-tip">
          提示：请输入要导入的题号，用半角逗号分隔
        </p>
        <div>
          <List
            loading={isLoading}
            className="odd-special"
            dataSource={questions}
            renderItem={(item) => (
              <List.Item key={item.pid}>
                <PuzzleListItem
                  {...item}
                  showSelect
                  selected={selectedPids.includes(item.pid)}
                  onSelect={(val) => {
                    const _new = [...selectedPids];
                    if (val) {
                      _new.push(item.pid);
                    } else {
                      _new.splice(_new.indexOf(item.pid), 1);
                    }
                    setSelectedPids(_new);
                  }}
                />
              </List.Item>
            )}
          />
        </div>
      </div>
      <div className="action-bar">
        <Button
          className="save-btn"
          type="primary"
          loading={isLoading}
          onClick={handleSubmit}
        >
          保存题单
        </Button>
      </div>
    </div>
  );
};

export default PuzzleListCreate;
