import React from "react";
import "./Title.style.css";

const Title: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="codemate-title-container">
      <div className="codemate-title">
        <p>CODEMATE</p>
        <div className="title-border"></div>
      </div>
      <div className="title-text">{children}</div>
    </div>
  );
};

export default Title;
