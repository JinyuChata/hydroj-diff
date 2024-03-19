import React, { FC, useEffect } from "react";
import { ObjectiveType } from "vj/pages/problem_detail.page";
import ActionBar from "./ActionBar";

function updateLocalStorage(cacheKey: string, id: string, value?: any) {
  const cache = localStorage.getItem(cacheKey);
  let ans = {};
  try {
    if (cache) ans = JSON.parse(cache);
  } catch {}
  if (value) ans[id] = value;
  localStorage.setItem(cacheKey, JSON.stringify(ans));
  return ans[id] as string[] ?? []
}

export const ObjectiveQuestion = ({
  question,
  cacheKey
}: {
  question: ObjectiveType;
  cacheKey: string
}) => {
  const [selected, setSelected] = React.useState<number[]>([]);

  useEffect(() => {
    if (selected.length === 0) return;
    updateLocalStorage(
      cacheKey,
      question.id,
      selected.map((i) => String.fromCharCode(65 + i))
    );
  }, [selected]);

  useEffect(() => {
    const cachedAns = updateLocalStorage(cacheKey, question.id)
    setSelected(cachedAns.map(i => i.charCodeAt(0) - 65))
  }, [])

  if (question.type === "input") return <input type="text" />;
  else if (question.type === "textarea") return <textarea />;
  else if (question.type === "multiselect" || question.type === "select") {
    return (
      <ul>
        {question.choices.map((choice, index) => (
          <li
            onClick={() => {
              if (question.type === "select") setSelected([index]);
              else setSelected((prev) => [...prev, index].sort());
            }}
            className={`select-choice ${selected.includes(index) ? "selected" : ""}`}
          >
            <input
              id={`q${question.id}-c${index}`}
              value={index}
              name={question.id}
              type={question.type === "select" ? "radio" : "checkbox"}
            />
            <label
              htmlFor={`q${question.id}-c${index}`}
            >{`${String.fromCharCode(65 + index)}. ${choice}`}</label>
          </li>
        ))}
      </ul>
    );
  }
};

// const Objectives: FC<{ objectives: ObjectiveType[] }> = ({ objectives }) => {
//   return (
//     <div>
//       {objectives.map((obj) => (
//         <div className="question">
//           {obj.description && (
//             <div className="desc-title">
//               <span className="highlight">【题目描述】</span>
//               <span>{obj.description}</span>
//             </div>
//           )}
//           <ObjectiveQuestion question={obj} />
//           <ActionBar />
//         </div>
//       ))}
//     </div>
//   );
// };

// export default Objectives;
