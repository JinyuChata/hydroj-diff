import React, { useEffect } from "react";
import { Tabs, TabsProps } from "antd";
import TrainList from "./TrainList";
import useUrlSearch from "../../Hooks/useUrlSearch";
import PurchasedTable from "./PurchasedTable";
import Records from "./Records";
import { useInfiniteScroll } from "ahooks";
import { api, gql } from "vj/utils";
import axios from "axios";
import { STATUS_ACCEPTED } from "vj/constant/record";

const Train = () => {
  const {
    data: starredProblems,
    loading: starredLoading,
    loadingMore: starredLoadingMore,
    loadMore: starredLoadMore,
    noMore: starredNoMore,
    reload: starredReload,
  } = useInfiniteScroll(
    async (d) => {
      const currentPage = d?.page ?? 1;
      const {
        data: { starredProblems },
      } = await api(gql`starredProblems(page: ${currentPage}, limit: 10) {
      pid,
      title
      }`);
      const r = starredProblems.map((i) => ({
        pid: i.pid,
        name: i.title,
      }));
      console.log(r);
      return {
        list: r,
        page: currentPage + 1,
        isNoMore: starredProblems.length === 0,
      };
    },
    {
      isNoMore: (d) => d?.isNoMore,
      manual: true,
    },
  );

  const {
    data: faults,
    loadingMore: faultsLoadingMore,
    loading: faultLoading,
    loadMore: faultLoadMore,
    noMore: faultNoMore,
    reload: faultReload,
  } = useInfiniteScroll(
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
            full: true,
          },
        },
      );
      if (status === 200 && data.rdocs?.length > 0) {
        const listData = data.rdocs
          .map((i: any) => {
            const question = data.pdict[i.pid];
            return {
              pid: i.pid,
              name: question.title,
              tags: question.tag,
              result: i.status,
              score: i.score,
              lang: i.lang,
              acPercentage: question.nAccept / question.nSubmit,
              duration: i.time,
              rid: i._id,
              submitAt: new Date(i.judgeAt),
              time: new Date(i.judgeAt),
              difficulty: question.difficulty,
            };
          })
          .filter((i) => i.status !== STATUS_ACCEPTED)
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
      isNoMore: (data) => data?.hasNoMore,
    },
  );

  const tabItems: TabsProps["items"] = [
    { key: "records", label: "答题记录", children: <Records /> },
    {
      key: "faults",
      label: "错题",
      children: (
        <TrainList
          isFault
          timePrefix="上次尝试时间："
          data={faults?.list}
          loading={faultLoading}
          loadMore={faultLoadMore}
          loadingMore={faultsLoadingMore}
          noMore={faultNoMore}
        />
      ),
    },
    { key: "purchases", label: "已购", children: <PurchasedTable /> },
    {
      key: "favorites",
      label: "收藏",
      children: (
        <TrainList
          timePrefix="收藏时间："
          data={starredProblems?.list}
          loading={starredLoading}
          loadMore={starredLoadMore}
          loadingMore={starredLoadingMore}
          noMore={starredNoMore}
        />
      ),
    },
  ];

  const [curTab, setCurTab] = useUrlSearch("trainTab", {
    defaultValue: tabItems[0].key,
    validator: (val) => {
      return tabItems.map((item) => item.key).includes(val);
    },
  });

  useEffect(() => {
    if (curTab === "faults") {
      faultReload();
    } else if (curTab === "favorites") {
      starredReload();
    }
  }, [curTab]);

  return (
    <div>
      <Tabs items={tabItems} activeKey={curTab} onChange={setCurTab} />
    </div>
  );
};

export default Train;
