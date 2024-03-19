import { Button, List } from "antd";
import _ from "lodash";
import React from "react";

import "./TrainList.style.css";
import dayjs from "dayjs";

import ErrorIcon from "vj/misc/icons/train-error-icon.svg?react";
import { usePagination } from "ahooks";
import { api, gql } from "vj/utils";

type ListItemType = {
  pid: string;
  name?: string;
  time?: Date;
};

const example: ListItemType = {
  pid: "P10000",
  name: "超级玛丽",
  time: new Date(),
};

const data: ListItemType[] = _.times(20, () => example);

const FaultItem: React.FC<
  ListItemType & { isFault: boolean; timePrefix?: string }
> = ({ pid, name, time, isFault, timePrefix }) => {
  return (
    <div className="fault-item">
      <a href={`/p/${pid}`} className="fault-pid">
        {`P${"0".repeat(5 - pid.toString().length)}${pid}`}
      </a>
      <a href={`/p/${pid}`} className="fault-name">
        {name}
        {isFault && <ErrorIcon />}
      </a>
      <span className="fault-submit-time">
        {timePrefix}
        {dayjs(time).format("YYYY年MM月DD日 HH:mm:ss")}
      </span>
    </div>
  );
};

interface IProps {
  isFault?: boolean;
  timePrefix?: string;
  data?: ListItemType[];
  loading?: boolean;
  noMore?: boolean;
  loadMore?: () => void;
  loadingMore?: boolean;
}

const TrainFaults: React.FC<IProps> = ({
  isFault,
  timePrefix,
  data,
  loading,
  loadMore,
  loadingMore,
  noMore,
}) => {
  return (
    <>
      <List
        loading={loading}
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <FaultItem {...item} isFault={isFault} timePrefix={timePrefix} />
          </List.Item>
        )}
      />
      {!loading && (
        <div className="load-more-btn">
          <Button onClick={loadMore} disabled={noMore} loading={loadingMore}>
            {noMore ? "没有啦" : "加载更多"}
          </Button>
        </div>
      )}
    </>
  );
};

export default TrainFaults;
