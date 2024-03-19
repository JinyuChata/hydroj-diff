import { Button, ConfigProvider, Progress, Tooltip } from "antd";
import React from "react";
import HelperIcon from "vj/misc/icons/recharge-tip.svg?react";

import "./Achievements.style.css";
import { useRequest } from "ahooks";

import RankTierIcon from "vj/misc/icons/rank-tier.svg?react";

const Achievements = () => {
  const { data: pointReq } = useRequest(async () => {
    return {
      percentage: 50,
      remaining: 500,
      current: 10000,
      tier: "adventurer",
    };
  });

  const { data: abilityReq } = useRequest(async () => {
    return {
      percentage: 50,
      remaining: 500,
      pointLevel: 6,
      CFFLevel: 8,
    };
  });

  return (
    <div>
      <div className="ach-item-card">
        <div className="card-left-main">
          <div className="card-top">
            <div className="card-top-title">
              <div className="card-title-text">
                <span className="text-content">我的积分</span>
                <span className="tooltip-icon">
                  <Tooltip title="tooltip">
                    <HelperIcon />
                  </Tooltip>
                </span>
              </div>
              <div className="points-value">{pointReq?.current}</div>
            </div>
          </div>
          <div className="card-progress-bar">
            <Progress percent={pointReq?.percentage} showInfo={false} />
            <div className="progress-text">
              距离下一个级别还差{pointReq?.remaining}分
            </div>
          </div>
        </div>
        <div className="card-right-icon">
          <img
            className="tier-icon-png"
            src={`/img/ranks/${pointReq?.tier}.png`}
          />
        </div>
      </div>
      <div className="ach-item-card">
        <div className="card-left-main">
          <div className="card-top">
            <div className="card-top-title">
              <div className="card-title-text">
                <span className="text-content">积分等级</span>
                <span className="tooltip-icon">
                  <Tooltip title="tooltip">
                    <HelperIcon />
                  </Tooltip>
                </span>
              </div>
              <div className="rank-value">
                <span className="level-prefix">LV.</span>
                <span className="level-value">{abilityReq?.pointLevel}</span>
              </div>
            </div>
            <div className="card-top-title">
              <div className="card-title-text">
                <span className="text-content">CFF等级</span>
                <span className="tooltip-icon">
                  <Tooltip title="tooltip">
                    <HelperIcon />
                  </Tooltip>
                </span>
              </div>
              <div className="rank-value">
                <span className="level-prefix">LV.</span>
                <span className="level-value">{abilityReq?.CFFLevel}</span>
              </div>
            </div>
          </div>
          <div className="card-progress-bar">
            <Progress percent={abilityReq?.percentage} showInfo={false} />
            <div className="progress-text">
              距离下一个级别还差{abilityReq?.remaining}分
            </div>
          </div>
          <div className="card-action-button">
            <ConfigProvider theme={{ token: { colorPrimary: "#2E77E3" } }}>
              <Button
                shape="round"
                type="primary"
                style={{ fontSize: "12px", lineHeight: 0 }}
              >
                自我认定
              </Button>
            </ConfigProvider>
          </div>
        </div>
        <div className="card-right-icon">
          <RankTierIcon />
        </div>
      </div>
      <div className="ach-item-card">
        <div className="card-left-main">
          <div className="card-top">
            <div className="card-top-title">
              <div className="card-title-text">
                <span className="text-content">我的角色</span>
              </div>
              <div className="role-value">小学生 </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
