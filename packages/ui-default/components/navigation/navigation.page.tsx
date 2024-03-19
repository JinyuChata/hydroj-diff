import React from "react";
import { AutoloadPage } from "vj/api";
import * as HoverCard from "@radix-ui/react-hover-card";
import { createRoot } from "react-dom/client";
import AccountIcon from "vj/misc/icons/popup-account.svg?react";
import ListIcon from "vj/misc/icons/popup-list.svg?react";
import SettingIcon from "vj/misc/icons/popup-setting.svg?react";
import TrainIcon from "vj/misc/icons/popup-train.svg?react";
import CompetitionIcon from "vj/misc/icons/popup-train.svg?react";

const HoverCardItems = [
  { icon: <TrainIcon />, text: "我的训练", link: "/user/center?tab=0" },
  { icon: <ListIcon />, text: "我的题单", link: "/user/center?tab=1" },
  { icon: <CompetitionIcon />, text: "我的比赛", link: "/user/center?tab=2" },
  { icon: <AccountIcon />, text: "我的账号", link: "/user/center?tab=3" },
  { icon: <SettingIcon />, text: "个人设置", link: "/user/center?tab=4" },
];

const Avatar = () => {
  return (
    <HoverCard.Root openDelay={100}>
      <HoverCard.Trigger asChild>
        <a href="/user/center">
          <img
            src={UiContext.cdn_prefix + "img/avatar.png"}
            alt="avatar"
            style={{ width: 40, height: 40, borderRadius: "50%" }}
          />
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          style={{ zIndex: 999 }}
          className="HoverCardContent"
          sideOffset={5}
        >
          <div className="hover-card-username">{UiContext.username}</div>
          <div className="hover-card-menu-list">
            {HoverCardItems.map((item) => (
              <a key={item.text} className="menu-item" href={item?.link}>
                {item.icon}
                <span>{item.text}</span>
              </a>
            ))}
          </div>
          <a className="hover-card-logout-btn" href="/logout">
            退出登录
          </a>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
};

export default new AutoloadPage("navigationPage", () => {
  const avatarElement = document.getElementById("avatar-react-root");
  if (avatarElement) {
    createRoot(avatarElement).render(<Avatar />);
  }
});
