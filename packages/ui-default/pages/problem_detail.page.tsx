import React from "react";
import { createRoot } from "react-dom/client";
import $ from "jquery";
import { NamedPage, loadReactRedux, tpl } from "vj/api";
import { ObjectiveQuestion } from "vj/components/problem/Objectives";
import ActionBar from "vj/components/problem/ActionBar";
import * as yaml from "js-yaml";
import axios from "axios";
import Notification from "vj/components/notification";
import { delay } from "vj/utils/base";
import _ from "lodash";

export type ObjectiveType = {
  description?: string;
  id: string;
} & (
  | {
      type: "input" | "textarea";
    }
  | {
      type: "select" | "multiselect";
      choices: string[];
    }
);

function getDescription(node: ChildNode) {
  let target = node.previousSibling;
  while (target.nodeName === "#text" && target.previousSibling) {
    target = target.previousSibling;
  }
  if (target.nodeName === "#text") {
    console.error("No description found for: ", node);
  }
  return target.textContent;
}

function loadObjectives(root: ChildNode, cacheKey: string) {
  if (!root) {
    console.error(
      "Error when rendering objective question: Root Node is invalid",
    );
    return;
  }
  const questions: ObjectiveType[] = [];
  const reg = /{{ (input|select|multiselect|textarea)\(\d+(-\d+)?\) }}/g;

  root.childNodes?.forEach((child) => {
    if (child.nodeName === "OL") {
      $(child)
        .addClass("question")
        .children()
        .first()
        .addClass("desc-title")
        .prepend(
          `<span style="color: #ff7d37; font-size: 18px;">【题目描述】</span>`,
        );
    }
    try {
      const [info, type] = reg.exec(child.textContent);
      console.log(info, type, child);
      const id = info.replace(
        /{{ (input|select|multiselect|textarea)\((\d+(-\d+)?)\) }}/,
        "$2",
      );
      switch (type) {
        case "input":
        case "textarea":
          questions.push({ id, type, description: getDescription(child) });
          $(child).html(
            $(child)
              .html()
              .replace(
                info,
                type === "input"
                  ? `<input id="p${id}" type="text" />`
                  : `<textarea id="p${id}" style="width: 100%; min-height: 150px;" />`,
              ),
          );
          $(`#p${id}`).on("input", (e) => {
            const cache = localStorage.getItem(cacheKey);
            let ans = {};
            try {
              if (cache) ans = JSON.parse(cache);
            } catch {}
            ans[id] = (e.target as any).value;
            localStorage.setItem(cacheKey, JSON.stringify(ans));
          });
          break;
        case "select":
        case "multiselect": {
          let ul = child.nextSibling;
          while (ul.nodeName !== "UL" && ul.nextSibling) {
            ul = ul.nextSibling;
          }
          if (ul.nodeName === "UL") {
            const choices: string[] = [];
            ul.childNodes.forEach((c) => {
              if (c.nodeName === "LI") {
                choices.push(c.textContent);
                c.remove();
              }
            });
            const q = {
              id,
              type,
              choices,
              description: getDescription(child),
            };
            questions.push(q);
            $(child).html(
              $(child)
                .html()
                .replace(
                  info,
                  `<div id="p${id}-root" style="margin-top: 22px;"></div>`,
                ),
            );
            createRoot($(`#p${id}-root`).get(0)).render(
              <ObjectiveQuestion question={q} cacheKey={cacheKey} />,
            );
          }
        }
        default:
          break;
      }
    } catch (e) {}
  });
  return questions;
}

function loadPrevObjectiveAns(cacheKey: string) {
  const cache = localStorage.getItem(cacheKey);
  try {
    for (const [id, val] of Object.entries(JSON.parse(cache))) {
      $(`#p${id}, #p${id}`).val(val as string);
    }
  } catch {}
}

async function submitAnswer(cacheKey: string) {
  const ans = JSON.parse(localStorage.getItem(cacheKey));
  console.log(yaml.dump(ans));
  try {
    const { data } = await axios.post(
      UiContext.postSubmitUrl + window.location.search,
      {
        lang: "_",
        code: yaml.dump(ans),
      },
    );
    console.log(data);
    localStorage.removeItem(cacheKey);
    window.location.href = data.url;
  } catch (e) {
    if (e instanceof Error) Notification.error(e.message);
  }
}

class ProblemPageExtender {
  isExtended: boolean;
  inProgress: boolean;
  $content: JQuery<HTMLElement>;
  $contentBound: JQuery<HTMLElement>;
  $scratchpadContainer: JQuery<HTMLElement>;
  constructor() {
    this.isExtended = false;
    this.inProgress = false;
    this.$content = $(".problem-content-container");
    this.$contentBound = this.$content.closest(".topicBottom");
    this.$scratchpadContainer = $(".scratchpad-container");
  }

  async extend() {
    if (this.inProgress) return;
    if (this.isExtended) return;
    this.inProgress = true;

    const bound = this.$contentBound.get(0).getBoundingClientRect();

    // @ts-ignore
    this.$content.transition({ opacity: 0 }, { duration: 100 });
    await delay(100);

    $("body").addClass("header--collapsed mode--scratchpad");
    await this.$scratchpadContainer
      .css({
        left: bound.left,
        top: bound.top,
        width: bound.width,
        height: bound.height,
      })
      .show()
      .transition(
        {
          // @ts-ignore
          left: 0,
          top: 10,
          width: "100%",
          height: "100%",
        },
        {
          duration: 500,
          easing: "easeOutCubic",
        },
      )
      .promise();

    $(".main > .row").hide();
    $(".footer").hide();
    $(window).scrollTop(0);
    window.document.body.style.overflow = "hidden";

    this.inProgress = false;
    this.isExtended = true;
  }

  async collapse() {
    if (this.inProgress) return;
    if (!this.isExtended) return;
    this.inProgress = true;

    $(window).scrollTop(0);
    $(".main > .row").show();
    $(".footer").show();

    const bound = this.$contentBound.get(0).getBoundingClientRect();

    $("body").removeClass("header--collapsed mode--scratchpad");

    await this.$scratchpadContainer
      .transition(
        {
          // @ts-ignore
          left: bound.left,
          top: bound.top,
          width: bound.width,
          height: bound.height,
        },
        {
          duration: 500,
          easing: "easeOutCubic",
        },
      )
      .promise();

    this.$scratchpadContainer.hide();
    // @ts-ignore
    this.$content.transition({ opacity: 1 }, { duration: 100 });
    window.document.body.style.overflow = "scroll";

    this.inProgress = false;
    this.isExtended = false;
  }

  toggle() {
    if (this.isExtended) this.collapse();
    else this.extend();
  }
}

export default new NamedPage(
  ["problem_detail", "contest_detail_problem", "homework_detail_problem"],
  async (pageName) => {
    let reactLoaded = false;
    let renderReact = null;
    let unmountReact = null;
    const extender = new ProblemPageExtender();

    async function loadScratch() {
      const el = document.createElement('iframe');
      el.id = 'scratchframe';
      el.src = '/scratch.html';
      el.style = `
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        position: fixed;
        overflow: hidden;
        z-index: 999999;
      `;
      document.body.appendChild(el);
      await new Promise((resolve,reject)=>{
        const t = setTimeout(reject, 30000);
        window.onmessage = (data) => {
          if (data?.data?.type === 'ready') {
            clearTimeout(t);
            resolve();
          }
        }
      });
      let show=true;
      return function switchVisibility() {
        show=!show;
        el.style.display = show ? 'block' : 'hidden';
      }
    }

    async function readCode():Promise<Blob> {
      const sub=document.getElementById('scratchframe').contentWindow;
      if (!sub) throw new Error('not loaded');
      return await new Promise((resolve,reject)=>{
        const t = setTimeout(reject, 30000);
        window.onmessage = (data) => {
          if (data?.data?.type === 'sb3') {
            clearTimeout(t);
            resolve(data.data.data);
          }
        }
        sub.postMessage({type: 'export'}, '*');
      })
    }

    async function loadScratchpad() {
      if (reactLoaded) return;
      $(".loader-container").show();

      const { default: WebSocket } = await import("../components/socket");
      const { default: ScratchpadApp } = await import(
        "../components/scratchpad"
      );
      const { default: ScratchpadReducer } = await import(
        "../components/scratchpad/reducers"
      );
      const { Provider, store } = await loadReactRedux(ScratchpadReducer);

      // @ts-ignore
      window.store = store;
      const sock = new WebSocket(
        UiContext.ws_prefix + UiContext.pretestConnUrl,
      );
      sock.onmessage = (message) => {
        const msg = JSON.parse(message.data);
        store.dispatch({
          type: "SCRATCHPAD_RECORDS_PUSH",
          payload: msg,
        });
      };

      renderReact = () => {
        const root = createRoot($("#scratchpad").get(0));
        root.render(
          <Provider store={store}>
            <ScratchpadApp />
          </Provider>,
        );
        unmountReact = () => root.unmount();
      };
      reactLoaded = true;
      $(".loader-container").hide();
    }

    let progress = false;

    async function enterScratchpadMode() {
      if (progress) return;
      progress = true;
      await extender.extend();
      await loadScratchpad();
      renderReact();
      $("#scratchpad").show().transition({ opacity: 1, duration: 100 });
      progress = false;
    }

    async function leaveScratchpadMode() {
      if (progress) return;
      progress = true;
      $("#scratchpad").hide().transition({ opacity: 0, duration: 100 });
      $(".problem-content-container").append($(".problem-content"));
      await extender.collapse();
      unmountReact();
      progress = false;
    }

    const handleStarChange = async (
      pid: string,
      operation: "star" | "unstar",
    ) => {
      const { status } = await axios.post(
        "/p",
        {
          pid,
          operation,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      if (status === 200) {
        Notification.success(operation === "star" ? "收藏成功" : "取消成功");
        if (operation === "star") {
          $("#star-btn").hide();
          $("#unstar-btn").show();
          UiContext.starred = true;
        } else {
          $("#star-btn").show();
          $("#unstar-btn").hide();
          UiContext.starred = false;
        }
      }
    };

    const handleSubmitCode = async () => {
      const { data, status } = await axios.post(UiContext.postSubmitUrl, {
        lang: "cc.cc14o2",
        code: $("#code-input").val(),
      });
      if (status === 200 && data.url) {
        window.location.href = data.url;
      }
    };
    $("#star-btn").on("click", () => {
      handleStarChange(UiContext.pdoc.docId, "star");
    });
    $("#unstar-btn").on("click", () => {
      handleStarChange(UiContext.pdoc.docId, "unstar");
    });
    $("#submit-btn").on("click", () => {
      handleSubmitCode();
    });

    if (UiContext.starred) {
      $("#star-btn").show();
      $("#unstar-btn").hide();
    } else {
      $("#unstar-btn").show();
      $("#star-btn").hide();
    }

    $(document).on(
      "click",
      '[name="problem-sidebar__open-scratchpad"]',
      (ev) => {
        enterScratchpadMode();
        ev.preventDefault();
      },
    );
    $(document).on(
      "click",
      '[name="problem-sidebar__quit-scratchpad"]',
      (ev) => {
        leaveScratchpadMode();
        ev.preventDefault();
      },
    );

    if (UiContext.pdoc.config?.type === "objective") {
      let cacheID = `${UserContext._id}/${UiContext.pdoc.domainId}/${UiContext.pdoc.docId}`;
      if (UiContext.tdoc?._id && UiContext.tdoc.rule !== "homework")
        cacheID += `@${UiContext.tdoc._id}`;

      const cacheKey = `${cacheID}#objectives`;

      const objectiveRoot = document.querySelector(".problem-content .typo");
      loadObjectives(objectiveRoot, cacheKey);
      loadPrevObjectiveAns(cacheKey);
      $(objectiveRoot).removeClass("typo").append($('<div id="action-bar" />'));
      createRoot($("#action-bar").get(0)).render(
        <ActionBar onSubmit={() => submitAnswer(cacheKey)} />,
      );
    }
  },
);
