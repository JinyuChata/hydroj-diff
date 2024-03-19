import React from "react";
import EditIcon from "vj/misc/icons/edit-question-list.svg?react";
import { showEditModal } from "./EditModal";

export interface ListItemType extends Record<string, any> {
  name?: string;
  pids?: number[];
  description?: string;
  tid?: string;
}

// const example: ListItemType = {
//   name: "MICHAEL精选",
//   pids: [],
//   description: "Python暑假训练精选题目",
// };

export const transformTDoc = (data: any): ListItemType => {
  return {
    name: data.title,
    pids: data.pids,
    description: data.content,
    tid: data._id,
  };
};

const HomeworkItem: React.FC<
  ListItemType & {
    hideQNum?: boolean;
    showModalEdit?: boolean;
    onClick?: () => void;
    onEditMeta?: (item: ListItemType) => void;
    onEditContent?: () => void;
  }
> = ({
  name,
  pids = [],
  description,
  hideQNum,
  showModalEdit,
  onEditMeta,
  onEditContent,
  onClick,
}) => {
  return (
    <div className="homework-item">
      <span className="homework-name" onClick={onClick}>
        {name}
      </span>
      <span
        style={{ visibility: hideQNum ? "hidden" : "visible" }}
        className="homework-qnum"
      >
        {pids.length}题
      </span>
      <span className="homework-description">{description}</span>
      <span
        className="homework-edit"
        onClick={() => {
          showEditModal({
            info: { name, description },
            isLocked: showModalEdit,
            onConfirm: onEditMeta,
            onEditMore: onEditContent,
          });
        }}
      >
        <EditIcon />
      </span>
    </div>
  );
};

export default HomeworkItem;
