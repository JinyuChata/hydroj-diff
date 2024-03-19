import { Checkbox, Radio } from "antd";
import React from "react";

import "./PuzzleListItem.style.css";
import { useControllableValue } from "ahooks";

export interface PuzzleListItemType {
  pid: number;
  name: string;
}

interface IProps extends PuzzleListItemType {
  showSelect?: boolean;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
  className?: string;
}

const PuzzleListItem: React.FC<IProps> = (props) => {
  const { pid, name, showSelect, className } = props;

  const [selected, setSelected] = useControllableValue<boolean>(props, {
    valuePropName: "selected",
    defaultValuePropName: "defaultSelected",
    trigger: "onSelect",
  });

  return (
    <div className={`puzzle-list-item-wrapper ${className}`}>
      <a target="_blank" href={`/p/${pid}`} className="puzzle-pid">
        {`P${"0".repeat(5 - pid.toString().length)}${pid}`}
      </a>
      <a target="_blank" href={`/p/${pid}`} className="puzzle-name">
        {name}
      </a>
      {showSelect && (
        <Checkbox
          checked={selected}
          onChange={(e) => setSelected(e.target.checked)}
        />
      )}
    </div>
  );
};

export default PuzzleListItem;
