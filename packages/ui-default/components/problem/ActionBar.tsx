import React from "react";

const ActionBar = ({
  status = "wait",
  onSubmit,
}: {
  status?: "wait" | "success" | "fail";
  onSubmit?: () => void;
}) => {
  return (
    <div className="actions">
      <button
        type="submit"
        onClick={onSubmit}
        className="action-btn fill-orange"
      >
        确认提交
      </button>
      {status !== "wait" && (
        <p className={`result-text ${status}`}>
          回答{status === "success" ? "正确" : "错误"}
        </p>
      )}
      {status === "fail" && (
        <button className="action-btn outlined-orange">再次挑战</button>
      )}
      <button className="action-btn outlined-orange">AI推题</button>
      <button className="action-btn ">上难度</button>
      <button className="action-btn ">评价</button>
      <button className="action-btn ">重新选题</button>
      <button className="action-btn fill-blue">分享</button>
      <button className="action-btn fill-orange">PK邀请</button>
    </div>
  );
};

export default ActionBar;
