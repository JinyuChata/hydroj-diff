import React from "react";
import "./SideTab.style.css";
import WhiteArrowIcon from "vj/misc/icons/white-arrow-right.svg?react";
import DarkArrowIcon from "vj/misc/icons/dark-arrow-right.svg?react";

interface IProps {
  isActive?: boolean;
  onClick?: () => void;
}

const SideTab: React.FC<React.PropsWithChildren<IProps>> = ({
  isActive,
  onClick,
  children,
}) => {
  return (
    <div onClick={onClick} className={`side-tab-item ${isActive ? "selected" : ""}`}>
      <span>{children}</span>
      {isActive ? <WhiteArrowIcon /> : <DarkArrowIcon />}
    </div>
  );
};

export default SideTab;
